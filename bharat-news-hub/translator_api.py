"""
Bharat News - IndicTrans2 Translation Server
=============================================
Uses the real ai4bharat/indictrans2-en-indic-dist-200M model
with IndicProcessor for preprocessing/postprocessing.
"""

import re
import asyncio
import traceback
import time
import torch
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from bs4 import BeautifulSoup, NavigableString
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from IndicTransToolkit.processor import IndicProcessor

# ============================================================
# CONFIG
# ============================================================
MODEL_NAME = "ai4bharat/indictrans2-en-indic-dist-200M"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE = 8
SRC_LANG = "eng_Latn"

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
# LOAD MODEL & PROCESSOR
# ============================================================
print(f"[IndicTrans2] Loading model: {MODEL_NAME}")
print(f"[IndicTrans2] Device: {DEVICE}")

ip = IndicProcessor(inference=True)
print("[IndicTrans2] IndicProcessor initialized.")

model = None
tokenizer = None
model_load_error = None

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

    # On CPU: use float32 (no flash_attention_2)
    # On GPU: use float16 + flash_attention_2
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
    print("[IndicTrans2] Model loaded successfully!")
except Exception as e:
    model_load_error = str(e)
    print(f"[IndicTrans2] ERROR: {model_load_error}")

# ============================================================
# TRANSLATION ENGINE (using IndicProcessor)
# ============================================================
def batch_translate(input_sentences: list[str], tgt_lang: str) -> list[str]:
    if model_load_error:
        raise RuntimeError(model_load_error)
    if not input_sentences:
        return []

    translations = []
    for i in range(0, len(input_sentences), BATCH_SIZE):
        batch = input_sentences[i:i + BATCH_SIZE]
        batch_start = time.time()

        # Preprocess with IndicProcessor: normalization, transliteration, language tags
        batch_preprocessed = ip.preprocess_batch(batch, src_lang=SRC_LANG, tgt_lang=tgt_lang)

        # Tokenize
        inputs = tokenizer(
            batch_preprocessed,
            truncation=True,
            padding="longest",
            return_tensors="pt",
            return_attention_mask=True,
        ).to(DEVICE)

        # Generate translations (greedy for speed on CPU)
        with torch.no_grad():
            generated_tokens = model.generate(
                **inputs,
                use_cache=False,
                min_length=0,
                max_length=128,     # Reduced from 256 for faster inference on text nodes
                num_beams=1,        # Greedy decode for CPU speed
                num_return_sequences=1,
            )

        # Decode tokens
        decoded = tokenizer.batch_decode(
            generated_tokens,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )

        # Postprocess with IndicProcessor: entity replacement, script fixing
        postprocessed = ip.postprocess_batch(decoded, lang=tgt_lang)
        translations.extend(postprocessed)

        del inputs
        batch_time = time.time() - batch_start
        print(f"  [batch {i//BATCH_SIZE + 1}] {len(batch)} sentences in {batch_time:.1f}s")

    return translations


# ============================================================
# HTML-AWARE TRANSLATION
# ============================================================
def translate_html_sync(html_content: str, target_lang: str) -> str:
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

    texts_to_translate = [str(node).strip() for node in text_nodes]
    print(f"[IndicTrans2] {len(texts_to_translate)} text nodes -> {target_lang}")

    translated_texts = batch_translate(texts_to_translate, tgt_lang_code)

    for node, translated in zip(text_nodes, translated_texts):
        if translated and translated.strip():
            original = str(node)
            leading = original[:len(original) - len(original.lstrip())]
            trailing = original[len(original.rstrip()):]
            node.replace_with(NavigableString(leading + translated + trailing))

    return str(soup)


# ============================================================
# FASTAPI
# ============================================================
app = FastAPI()

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
    html_content: str
    target_lang: str


@app.post("/translate")
async def translate_endpoint(req: TranslateRequest):
    start = time.time()
    print(f"\n[API] POST /translate - lang={req.target_lang}, html_len={len(req.html_content)}")
    try:
        loop = asyncio.get_event_loop()
        translated = await loop.run_in_executor(
            None, translate_html_sync, req.html_content, req.target_lang
        )
        elapsed = time.time() - start
        print(f"[API] Done in {elapsed:.1f}s")
        return {
            "translated_html": translated,
            "target_lang": req.target_lang,
            "success": True,
            "engine": "IndicTrans2",
            "error": None,
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "translated_html": req.html_content,
            "target_lang": req.target_lang,
            "success": False,
            "engine": "IndicTrans2",
            "error": str(e),
        }


@app.get("/")
def health():
    return {"status": "running", "model": MODEL_NAME, "device": DEVICE}


if __name__ == "__main__":
    import uvicorn
    print(f"\n{'='*50}")
    print(f"  IndicTrans2 Server - http://localhost:8000")
    print(f"  Model: {MODEL_NAME}")
    print(f"  Languages: {', '.join(LANG_CODE_MAP.keys())}")
    print(f"{'='*50}\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
