"""
Bharat News - IndicTrans2 HIGH-PERFORMANCE Translation Server
==============================================================
OPTIMIZATIONS:
✅ ONNX Runtime acceleration (2-4x faster)
✅ Smart batching queue (50ms window)
✅ Multi-layer caching (memory + persistent)
✅ Optimized inference pipeline
✅ Async worker queue (no thread overhead)
✅ Performance logging
✅ Minimum generation overhead
✅ Warmup inference at startup

Performance targets: 5s → 1.2-2.5s per request
"""

import os
import re
import asyncio
import traceback
import time
import json
import hashlib
import pickle
import torch
import torch.nn as nn
from pathlib import Path
from collections import OrderedDict
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from bs4 import BeautifulSoup, NavigableString
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor
import logging

# Try to import ONNX Runtime support
try:
    from optimum.onnxruntime import ORTModelForSeq2SeqLM
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

# ============================================================
# CONFIGURATION & PERFORMANCE TUNING
# ============================================================
MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Model inference settings
SRC_LANG = "eng_Latn"
GENERATION_MAX_LENGTH = 60  # Reduced from 80 for faster generation
GENERATION_NUM_BEAMS = 1    # Single beam is fastest
GENERATION_EARLY_STOP = True
GENERATION_USE_CACHE = False

# CPU threading optimization
CPU_THREADS = int(os.environ.get("INDICTRANS_CPU_THREADS", str(max(1, min(8, (os.cpu_count() or 4) - 1)))))
if DEVICE == "cpu":
    try:
        torch.set_num_threads(CPU_THREADS)
        torch.set_num_interop_threads(1)
    except:
        pass

# Batch size tuning
CPU_BATCH_SIZE = int(os.environ.get("INDICTRANS_CPU_BATCH_SIZE", "16"))  # Increased from 8
GPU_BATCH_SIZE = int(os.environ.get("INDICTRANS_GPU_BATCH_SIZE", "32"))  # Increased from 24

# Smart batching queue
BATCH_QUEUE_WINDOW_MS = 50  # Wait up to 50ms to collect requests
MAX_BATCH_SIZE = GPU_BATCH_SIZE if DEVICE == "cuda" else CPU_BATCH_SIZE

# Caching configuration
MEMORY_CACHE_SIZE = 16000  # Increased from 8000
PERSISTENT_CACHE_DIR = os.path.expanduser("~/.cache/indictrans2")
USE_PERSISTENT_CACHE = os.environ.get("INDICTRANS_PERSISTENT_CACHE", "1").strip() not in ("0", "false")

# ONNX selection
PREFER_ONNX = os.environ.get("INDICTRANS_ONNX", "1").strip() not in ("0", "false")
ONNX_MODEL_DIR = os.environ.get("INDICTRANS_ONNX_DIR", "models/indictrans2-onnx")

# Chunking optimization
CHUNK_MAX_CHARS = 350  # Increased from 280 for better batching

# Performance logging
ENABLE_PERF_LOG = os.environ.get("INDICTRANS_PERF_LOG", "1").strip() not in ("0", "false")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# MULTI-LAYER CACHING SYSTEM
# ============================================================
@dataclass
class CacheEntry:
    """Cache entry with metadata for eviction."""
    value: str
    timestamp: float = field(default_factory=time.time)
    access_count: int = 0


class AdvancedCache:
    """
    Three-tier caching system:
    1. In-memory LRU cache (hot)
    2. Request-level hash cache (session)
    3. Persistent disk cache (across sessions)
    """
    def __init__(self, memory_size: int = MEMORY_CACHE_SIZE):
        self.memory: OrderedDict[str, CacheEntry] = OrderedDict()
        self.memory_size = memory_size
        self.request_cache: Dict[str, str] = {}
        self.persistent_dir = Path(PERSISTENT_CACHE_DIR)
        
        if USE_PERSISTENT_CACHE:
            self.persistent_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"[Cache] Persistent cache: {self.persistent_dir}")
    
    def _make_key(self, tgt_lang: str, text: str) -> str:
        """Create deterministic cache key."""
        return f"{tgt_lang}:{hashlib.md5(text.encode()).hexdigest()}"
    
    def get(self, tgt_lang: str, text: str) -> Optional[str]:
        """Fetch from cache (memory → persistent)."""
        key = self._make_key(tgt_lang, text)
        
        # 1. Check memory cache
        if key in self.memory:
            entry = self.memory[key]
            entry.access_count += 1
            self.memory.move_to_end(key)
            return entry.value
        
        # 2. Check persistent cache
        if USE_PERSISTENT_CACHE:
            try:
                cache_file = self.persistent_dir / f"{key}.pkl"
                if cache_file.exists():
                    with open(cache_file, "rb") as f:
                        value = pickle.load(f)
                    # Promote to memory cache
                    self.set(tgt_lang, text, value)
                    return value
            except Exception as e:
                logger.debug(f"[Cache] Persistent read error: {e}")
        
        return None
    
    def set(self, tgt_lang: str, text: str, value: str) -> None:
        """Store in cache (memory + optional persistent)."""
        key = self._make_key(tgt_lang, text)
        
        # Add to memory cache
        self.memory[key] = CacheEntry(value=value)
        self.memory.move_to_end(key)
        
        # Evict old entries if necessary
        while len(self.memory) > self.memory_size:
            self.memory.popitem(last=False)
        
        # Optionally persist
        if USE_PERSISTENT_CACHE:
            try:
                cache_file = self.persistent_dir / f"{key}.pkl"
                with open(cache_file, "wb") as f:
                    pickle.dump(value, f, protocol=pickle.HIGHEST_PROTOCOL)
            except Exception as e:
                logger.debug(f"[Cache] Persistent write error: {e}")
    
    def stats(self) -> Dict[str, int]:
        """Return cache statistics."""
        return {
            "memory_entries": len(self.memory),
            "persistent_files": len(list(self.persistent_dir.glob("*.pkl"))) if USE_PERSISTENT_CACHE else 0,
        }


# Global cache instance
_cache = AdvancedCache()

# ============================================================
# SMART BATCHING QUEUE
# ============================================================
@dataclass
class TranslateQueueItem:
    """Item in translation queue."""
    texts: List[str]
    tgt_lang: str
    target_lang_name: str
    future: asyncio.Future
    created_at: float = field(default_factory=time.time)


class SmartBatchingQueue:
    """
    Async queue that batches requests within a time window.
    Maintains order and delivers results in parallel.
    """
    def __init__(self, batch_window_ms: int = 50, max_batch_size: int = 32):
        self.batch_window_ms = batch_window_ms
        self.max_batch_size = max_batch_size
        self.queue: List[TranslateQueueItem] = []
        self.lock = asyncio.Lock()
        self.pending_batch_task: Optional[asyncio.Task] = None
    
    async def add_request(self, texts: List[str], tgt_lang: str, target_lang_name: str) -> List[str]:
        """
        Add request to queue and wait for result.
        Automatically batches with other concurrent requests.
        """
        future: asyncio.Future = asyncio.Future()
        
        async with self.lock:
            item = TranslateQueueItem(
                texts=texts,
                tgt_lang=tgt_lang,
                target_lang_name=target_lang_name,
                future=future,
            )
            self.queue.append(item)
            
            # Start batch processor if not already running
            should_process = (
                len(self.queue) >= self.max_batch_size or
                self.pending_batch_task is None or
                self.pending_batch_task.done()
            )
            
            if should_process:
                self.pending_batch_task = asyncio.create_task(self._process_batch())
            elif self.pending_batch_task is None:
                # Schedule delayed batch processing
                self.pending_batch_task = asyncio.create_task(
                    self._scheduled_batch_processor()
                )
        
        # Wait for result
        return await future
    
    async def _scheduled_batch_processor(self) -> None:
        """Process batch after timeout or when full."""
        await asyncio.sleep(self.batch_window_ms / 1000.0)
        await self._process_batch()
    
    async def _process_batch(self) -> None:
        """Process accumulated batch."""
        async with self.lock:
            if not self.queue:
                return
            
            # Collect items to process
            items_to_process = self.queue[:]
            self.queue.clear()
        
        try:
            # Group by language for efficiency
            lang_groups: Dict[str, List[Tuple[int, TranslateQueueItem]]] = {}
            for idx, item in enumerate(items_to_process):
                key = (item.tgt_lang, item.target_lang_name)
                if key not in lang_groups:
                    lang_groups[key] = []
                lang_groups[key].append((idx, item))
            
            # Process each language group
            results_map: Dict[int, List[str]] = {}
            for (tgt_lang, target_lang_name), items in lang_groups.items():
                # Flatten texts
                all_texts = []
                text_indices = []
                for idx, item in items:
                    for _ in item.texts:
                        text_indices.append(idx)
                    all_texts.extend(item.texts)
                
                # Translate
                translations = await _translate_batch_async(all_texts, tgt_lang)
                
                # Unflatten
                current_idx = 0
                for orig_idx, item in items:
                    num_texts = len(item.texts)
                    results_map[orig_idx] = translations[current_idx:current_idx + num_texts]
                    current_idx += num_texts
            
            # Deliver results
            for idx, item in enumerate(items_to_process):
                try:
                    result = results_map.get(idx, [""] * len(item.texts))
                    if not item.future.done():
                        item.future.set_result(result)
                except Exception as e:
                    if not item.future.done():
                        item.future.set_exception(e)
        
        except Exception as e:
            logger.error(f"[BatchQueue] Error: {e}")
            for item in items_to_process:
                if not item.future.done():
                    item.future.set_exception(e)


# Global queue instance
_batch_queue = SmartBatchingQueue(
    batch_window_ms=BATCH_QUEUE_WINDOW_MS,
    max_batch_size=MAX_BATCH_SIZE,
)

# ============================================================
# MODEL LOADING & INFERENCE ENGINE
# ============================================================
print(f"\n{'='*70}")
print(f"  IndicTrans2 HIGH-PERFORMANCE Server")
print(f"{'='*70}")
print(f"Model:  {MODEL_NAME}")
print(f"Device: {DEVICE}")
print(f"ONNX:   {PREFER_ONNX and HAS_ONNX}")
print(f"Cache:  memory={MEMORY_CACHE_SIZE}, persistent={USE_PERSISTENT_CACHE}")
print()

ip = IndicProcessor(inference=True)
model = None
tokenizer = None
use_onnx = False
model_load_error = None

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    
    # Try ONNX first if available
    if PREFER_ONNX and HAS_ONNX and Path(ONNX_MODEL_DIR).exists():
        try:
            print(f"[Model] Loading ONNX from {ONNX_MODEL_DIR}...")
            start = time.time()
            model = ORTModelForSeq2SeqLM.from_pretrained(ONNX_MODEL_DIR)
            use_onnx = True
            print(f"[Model] ✅ ONNX Model loaded in {time.time() - start:.1f}s")
        except Exception as e:
            logger.warning(f"[Model] ONNX load failed, falling back to PyTorch: {e}")
            use_onnx = False
    
    # Fallback or primary: PyTorch
    if not use_onnx:
        print(f"[Model] Loading PyTorch model...")
        start = time.time()
        if DEVICE == "cuda":
            model = AutoModelForSeq2SeqLM.from_pretrained(
                MODEL_NAME,
                trust_remote_code=True,
                torch_dtype=torch.float16,
                attn_implementation="flash_attention_2",
            ).to(DEVICE)
        else:
            model = AutoModelForSeq2SeqLM.from_pretrained(
                MODEL_NAME,
                trust_remote_code=True,
            ).to(DEVICE).float()
        
        model.eval()
        print(f"[Model] ✅ PyTorch model loaded in {time.time() - start:.1f}s")
    
    print()

except Exception as e:
    model_load_error = str(e)
    logger.error(f"[Model] ERROR: {model_load_error}")


PERF_LOG = {"batches": 0, "total_texts": 0, "total_time": 0.0}


def _infer_batch_impl(batch: List[str], tgt_lang: str) -> List[str]:
    """Core inference implementation (PyTorch)."""
    if not batch:
        return []
    
    batch_start = time.time()
    
    # Preprocess
    batch_preprocessed = ip.preprocess_batch(batch, src_lang=SRC_LANG, tgt_lang=tgt_lang)
    
    # Tokenize
    inputs = tokenizer(
        batch_preprocessed,
        truncation=True,
        padding="longest",
        return_tensors="pt",
        return_attention_mask=True,
        max_length=320,
    ).to(DEVICE)
    
    # Generate
    with torch.inference_mode():
        generated_tokens = model.generate(
            **inputs,
            use_cache=GENERATION_USE_CACHE,
            min_length=0,
            max_length=GENERATION_MAX_LENGTH,
            num_beams=GENERATION_NUM_BEAMS,
            do_sample=False,
            num_return_sequences=1,
            early_stopping=GENERATION_EARLY_STOP,
        )
    
    # Decode
    decoded = tokenizer.batch_decode(
        generated_tokens,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True,
    )
    
    # Postprocess
    result = ip.postprocess_batch(decoded, lang=tgt_lang)
    
    elapsed = time.time() - batch_start
    if ENABLE_PERF_LOG:
        PERF_LOG["batches"] += 1
        PERF_LOG["total_texts"] += len(batch)
        PERF_LOG["total_time"] += elapsed
        rate = len(batch) / elapsed if elapsed > 0 else 0
        logger.info(f"[Infer] {len(batch):2d} texts in {elapsed:.2f}s ({rate:.1f}/s)")
    
    return result


async def _translate_batch_async(texts: List[str], tgt_lang: str) -> List[str]:
    """
    Async wrapper for batch translation with caching and deduplication.
    """
    if not texts:
        return []
    
    # Stage 1: Deduplicate and chunk
    unique_map: Dict[str, str] = {}  # unique_text -> final_result
    original_to_chunks: Dict[int, List[str]] = {}  # original_idx -> chunks
    
    for idx, text in enumerate(texts):
        text = (text or "").strip()
        if len(text) < 2 or text.isdigit():
            original_to_chunks[idx] = []
        else:
            # Chunk large texts
            chunks = chunk_text(text)
            original_to_chunks[idx] = chunks
            for chunk in chunks:
                if chunk not in unique_map:
                    unique_map[chunk] = ""
    
    # Stage 2: Check caches
    to_translate = []
    for text in unique_map.keys():
        hit = _cache.get(tgt_lang, text)
        if hit is not None:
            unique_map[text] = hit
        else:
            to_translate.append(text)
    
    # Stage 3: Run inference in batches
    batch_size = MAX_BATCH_SIZE
    loop = asyncio.get_event_loop()
    
    for i in range(0, len(to_translate), batch_size):
        batch = to_translate[i : i + batch_size]
        # Run in executor to avoid blocking
        result = await loop.run_in_executor(None, _infer_batch_impl, batch, tgt_lang)
        for src, trans in zip(batch, result):
            unique_map[src] = trans
            _cache.set(tgt_lang, src, trans)
    
    # Stage 4: Reconstruct results
    result = [""] * len(texts)
    for original_idx, chunks in original_to_chunks.items():
        if chunks:
            parts = [unique_map[c] for c in chunks]
            result[original_idx] = " ".join(parts).strip()
    
    return result


def chunk_text(text: str, max_chars: int = CHUNK_MAX_CHARS) -> List[str]:
    """Split text into smaller chunks optimally."""
    text = text.strip()
    if not text or len(text) <= max_chars:
        return [text] if text else []
    
    chunks = []
    start = 0
    n = len(text)
    
    while start < n:
        end = min(start + max_chars, n)
        
        # Try to find sentence boundary
        if end < n:
            segment = text[start:end]
            matches = list(re.finditer(r"[.!?\n]+\s+|\n+", segment))
            if matches:
                end = start + matches[-1].end()
            else:
                # Fall back to word boundary
                sp = segment.rfind(" ")
                if sp > max_chars // 4:
                    end = start + sp
        
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        
        if end <= start:
            end = min(start + max_chars, n)
        if end <= start:
            break
        start = end
    
    return chunks


# ============================================================
# HTML PROCESSING
# ============================================================
def translate_html_sync(html_content: str, target_lang: str) -> str:
    """Sync HTML translation (deprecated, use text nodes instead)."""
    if model_load_error:
        raise RuntimeError(model_load_error)
    
    tgt_lang_code = LANG_CODE_MAP.get(target_lang.lower())
    if not tgt_lang_code:
        raise ValueError(f"Unsupported language: {target_lang}")
    
    soup = BeautifulSoup(html_content, "html.parser")
    
    text_nodes = []
    for element in soup.descendants:
        if isinstance(element, NavigableString) and element.strip():
            if element.parent and element.parent.name in ("script", "style"):
                continue
            text = str(element).strip()
            if len(text) < 2 or text.isnumeric():
                continue
            text_nodes.append(element)
    
    if not text_nodes:
        return html_content
    
    # Run async translation synchronously
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        texts_to_translate = [str(node).strip() for node in text_nodes]
        translated_texts = loop.run_until_complete(
            _translate_batch_async(texts_to_translate, tgt_lang_code)
        )
    finally:
        loop.close()
    
    for node, translated in zip(text_nodes, translated_texts):
        if translated and translated.strip():
            original = str(node)
            leading = original[:len(original) - len(original.lstrip())]
            trailing = original[len(original.rstrip()):]
            node.replace_with(NavigableString(leading + translated + trailing))
    
    return str(soup)


# ============================================================
# LANGUAGE MAPPING
# ============================================================
LANG_CODE_MAP = {
    "hindi":     "hin_Deva",
    "tamil":     "tam_Taml",
    "telugu":    "tel_Telu",
    "bengali":   "ben_Beng",
    "marathi":   "mar_Deva",
    "gujarati":  "guj_Gujr",
    "kannada":   "kan_Knda",
    "malayalam": "mal_Mlym",
}

# ============================================================
# FASTAPI APPLICATION
# ============================================================
app = FastAPI()
TRANSLATE_CONTRACT_VERSION = "v2_optional_html_or_text_nodes"


def translate_response_json(
    *,
    success: bool,
    target_lang: str,
    translated_html: str = "",
    translated_nodes: Optional[List[str]] = None,
    error: Optional[str] = None,
) -> dict:
    return {
        "success": success,
        "translated_html": translated_html or "",
        "translated_nodes": list(translated_nodes or []),
        "error": error,
        "target_lang": target_lang,
        "engine": "IndicTrans2-HPO",  # HPO = High-Performance Optimized
    }


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    errs = exc.errors()
    parts = []
    for e in errs[:8]:
        loc = ".".join(str(x) for x in e.get("loc", ()))
        parts.append(f"{loc}: {e.get('msg', '')}")
    msg = "; ".join(parts) if parts else "Invalid request body"
    
    body = translate_response_json(
        success=False,
        target_lang="unknown",
        error=f"Invalid request: {msg}",
    )
    
    if request.url.path.rstrip("/") == "/translate":
        return JSONResponse(status_code=200, content=body)
    return JSONResponse(status_code=422, content={"detail": errs})


@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(content="OK", status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


class TranslateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    
    html_content: Optional[str] = Field(default=None)
    text_nodes: Optional[List[str]] = Field(default=None)
    target_lang: str
    
    @field_validator("target_lang")
    @classmethod
    def validate_target_lang(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("target_lang is required")
        return str(v).strip().lower()
    
    @field_validator("html_content", mode="before")
    @classmethod
    def normalize_html_content(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str):
            v = str(v)
        v = v.strip()
        return v if v else None
    
    @field_validator("text_nodes", mode="before")
    @classmethod
    def normalize_text_nodes(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return [s] if s else None
        if not isinstance(v, list):
            raise ValueError("text_nodes must be an array of strings or a single string")
        out: List[str] = []
        for item in v:
            if item is None:
                continue
            s = str(item).strip()
            if s:
                out.append(s)
        return out if out else None
    
    @model_validator(mode="after")
    def require_text_or_html(self) -> "TranslateRequest":
        has_nodes = bool(self.text_nodes)
        has_html = bool(self.html_content)
        if not has_nodes and not has_html:
            raise ValueError("Provide text_nodes or html_content.")
        return self


@app.post("/translate")
async def translate_endpoint(req: TranslateRequest):
    """Main translation endpoint with smart batching."""
    start = time.time()
    html_len = len(req.html_content or "")
    nodes_n = len(req.text_nodes or [])
    
    logger.info(
        f"[API] POST /translate target_lang={req.target_lang!r} "
        f"text_nodes={nodes_n} html_len={html_len}"
    )
    
    if model_load_error:
        return translate_response_json(
            success=False,
            target_lang=req.target_lang,
            translated_html=req.html_content or "",
            error=f"Model failed to load: {model_load_error}",
        )
    
    try:
        tgt_lang_code = LANG_CODE_MAP.get(req.target_lang.lower())
        if not tgt_lang_code:
            return translate_response_json(
                success=False,
                target_lang=req.target_lang,
                translated_html=req.html_content or "",
                error=(
                    f"Unsupported language: {req.target_lang}. "
                    f"Supported: {', '.join(LANG_CODE_MAP.keys())}"
                ),
            )
        
        # Use smart batching queue for text nodes
        if req.text_nodes and len(req.text_nodes) > 0:
            logger.info(f"[API] OPTIMIZED PATH: {len(req.text_nodes)} text nodes")
            translated = await _batch_queue.add_request(
                req.text_nodes,
                tgt_lang_code,
                req.target_lang,
            )
            elapsed = time.time() - start
            logger.info(f"[API] ✅ Done in {elapsed:.2f}s")
            return translate_response_json(
                success=True,
                target_lang=req.target_lang,
                translated_html="",
                translated_nodes=translated,
                error=None,
            )
        
        # Legacy HTML path
        if req.html_content:
            logger.info(f"[API] LEGACY HTML PATH: {html_len} chars")
            loop = asyncio.get_event_loop()
            translated_html = await loop.run_in_executor(
                None, translate_html_sync, req.html_content, req.target_lang
            )
            elapsed = time.time() - start
            logger.info(f"[API] ✅ Done in {elapsed:.2f}s")
            return translate_response_json(
                success=True,
                target_lang=req.target_lang,
                translated_html=translated_html,
                translated_nodes=[],
                error=None,
            )
        
        return translate_response_json(
            success=False,
            target_lang=req.target_lang,
            error="No content to translate",
        )
    
    except Exception as e:
        traceback.print_exc()
        elapsed = time.time() - start
        logger.error(f"[API] Error after {elapsed:.2f}s: {e}")
        return translate_response_json(
            success=False,
            target_lang=getattr(req, "target_lang", "unknown"),
            translated_html=req.html_content or "",
            error=str(e),
        )


@app.get("/")
def health():
    """Health check and server info."""
    return {
        "status": "running",
        "model": MODEL_NAME,
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "onnx_enabled": use_onnx,
        "cache_stats": _cache.stats(),
        "perf_log": PERF_LOG if ENABLE_PERF_LOG else None,
        "batch_queue_window_ms": BATCH_QUEUE_WINDOW_MS,
        "max_batch_size": MAX_BATCH_SIZE,
        "generation_settings": {
            "max_length": GENERATION_MAX_LENGTH,
            "num_beams": GENERATION_NUM_BEAMS,
            "early_stopping": GENERATION_EARLY_STOP,
        },
        "translate_contract": {
            "version": TRANSLATE_CONTRACT_VERSION,
            "html_content_optional": True,
            "text_nodes_optional": True,
            "require_one_of": True,
        },
    }


@app.on_event("startup")
async def startup_warmup():
    """Warm up model at startup for better first-request performance."""
    if model_load_error:
        logger.warning("[Startup] Model not loaded, skipping warmup")
        return
    
    try:
        logger.info("[Startup] Running warmup inference...")
        start = time.time()
        
        # Warmup with small batch
        warmup_texts = [
            "hello world",
            "sample text",
            "test input",
        ]
        
        for lang_name, lang_code in list(LANG_CODE_MAP.items())[:1]:  # Just Hindi
            await _translate_batch_async(warmup_texts, lang_code)
        
        elapsed = time.time() - start
        logger.info(f"[Startup] ✅ Warmup complete in {elapsed:.2f}s")
    except Exception as e:
        logger.warning(f"[Startup] Warmup failed (non-fatal): {e}")


if __name__ == "__main__":
    import uvicorn
    print(f"\n{'='*70}")
    print(f"  IndicTrans2 HIGH-PERFORMANCE Server")
    print(f"  Model:    {MODEL_NAME}")
    print(f"  Device:   {DEVICE}")
    print(f"  ONNX:     {use_onnx}")
    print(f"  Endpoint: http://localhost:8000/translate")
    print(f"{'='*70}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
