# TROUBLESHOOTING GUIDE - Translation Timeout Optimization

**When to use this guide:** You're experiencing issues with the new chunking/streaming translation system.

---

## 🔴 Common Issues & Solutions

### Issue 1: "Still Getting Timeout Errors" ⏱️

**Symptoms:**
```
Translation timed out (>30s)
OR
Streaming failed, falling back...
```

**Root Causes & Solutions:**

#### Cause A: CPU-only execution (no GPU)
**Check:**
```bash
# Terminal: python
import torch
print(torch.cuda.is_available())  # Should be True
```

**If False (CPU only):**
- Translation is 10-20x slower (60+ seconds per article)
- Solution: Install GPU drivers
  ```bash
  # For NVIDIA GPU:
  pip install torch torchvision torchaudio pytorch-cuda=12.1 -f https://download.pytorch.org/whl/torch_stable.html
  
  # Or check: https://pytorch.org/get-started/locally/
  ```

#### Cause B: Model not fully loaded in GPU memory
**Check logs:**
```
[API] Device: cuda
[API] GPU Memory: OOM error
```

**Solution:**
```python
# In translator_api.py, increase memory cleanup:
torch.cuda.empty_cache()  # After each batch
torch.cuda.synchronize()  # Wait for GPU to finish
```

#### Cause C: Server overloaded (multiple simultaneous requests)
**Check:** How many articles are being translated at once?

**Solution:**
```python
# In translator_api.py, add request queue:
from asyncio import Semaphore

translate_semaphore = Semaphore(2)  # Max 2 concurrent translations

@app.post("/api/translate-stream")
async def translate_stream_endpoint(req):
    async with translate_semaphore:
        # ... actual translation code
```

**Or:** Reduce chunk size in frontend:
```typescript
// In translationService.ts, line ~47:
const CHUNK_SIZE = 30;  // Was 40, now smaller = faster per-chunk
```

---

### Issue 2: "Streaming Response Doesn't Update" 📺

**Symptoms:**
```
onProgress() never called
OR
Progress stuck at 0%
```

**Root Causes:**

#### Cause A: EventSource not reading properly
```typescript
// WRONG - Missing newline handling
const data = JSON.parse(value);

// CORRECT - Handle NDJSON format
const lines = buffer.split("\n");
for (const line of lines) {
  if (line.trim()) {
    const data = JSON.parse(line);
  }
}
```

**Check:** Code in `translateWithStreaming()` function, lines ~95-120

#### Cause B: Backend not sending SSE format correctly
**Check backend logs:**
```
Should see: {"chunk_id": 0, "translated_nodes": [...], "progress": 20}
NOT: HTML response or error page
```

**Fix:** Verify `/api/translate-stream` endpoint returns proper JSON

**Test:**
```bash
curl -X POST http://localhost:8000/api/translate-stream \
  -H "Content-Type: application/json" \
  -d '{"text_nodes": ["Hello world", "How are you"], "target_lang": "hindi"}' \
  -N  # No buffering
```

**Expected output:**
```json
{"chunk_id": 0, "progress": 100, "translated_nodes": ["नमस्ते दुनिया", "आप कैसे हैं"], "done": true}
```

#### Cause C: Callback not wired to UI
**Check:** In React component:

```typescript
// This should update state:
await translateArticle(html, lang, (update) => {
  console.log("Progress received:", update);  // Should log every 4-5s
  setProgress(update.progress);               // Update state
});
```

**Debug:**
```typescript
// Add console.log to verify callbacks fired:
const result = await translateArticle(html, lang, (update) => {
  console.log(`PROGRESS: ${update.progress}%`);  // Check DevTools console
});
```

---

### Issue 3: "Out of Memory (OOM) Error" 💾

**Symptoms:**
```
CUDA out of memory
OR
RuntimeError: CUDA out of memory
```

**Root Causes:**

#### Cause A: Chunk size too large
**Current default:** 40 nodes/chunk (~600 tokens on GPU)

**Check hardware:**
```bash
# Terminal: python
import torch
print(torch.cuda.get_device_name(0))  # GPU model
print(torch.cuda.max_memory_allocated() / 1e9, "GB")  # Memory used
```

**Solutions (try in order):**

1. **Reduce chunk size (frontend):**
```typescript
// translationService.ts, line ~47:
const CHUNK_SIZE = 30;  // Was 40
```

2. **Reduce per-batch size (backend):**
```python
# translator_api.py, line ~75:
batch_size = 6 if DEVICE == "cuda" else 2  # Was 8, now 6
```

3. **Lower max_length (backend):**
```python
# translator_api.py, line ~93:
max_length=48,  # Was 64, now 48
```

#### Cause B: Multiple requests at same time
**Check:** How many articles being translated in parallel?

**Solution:** Limit concurrent requests:
```python
# In translator_api.py:
from threading import Semaphore

concurrent_limit = Semaphore(1)  # Only 1 translation at a time

@app.post("/api/translate-stream")
async def translate_stream_endpoint(req):
    with concurrent_limit:
        # Actual translation
```

#### Cause C: Model loaded incorrectly
**Check logs at startup:**
```
[IndicTrans2] Loading model: ai4bharat/indictrans2-en-indic-dist-200M
[IndicTrans2] Device: cuda
[IndicTrans2] Model loaded successfully!
```

**If error:**
```
[IndicTrans2] ERROR: Model load failed
```

**Fix:**
```bash
# Clear cache and reload:
rm -rf ~/.cache/huggingface/
python translator_api.py  # Will re-download model
```

---

### Issue 4: "Wrong Language or Gibberish Output" 🔤

**Symptoms:**
```
Translated to Hindi but content looks like Tamil
OR
Random characters: "उभमभा हिंमभा नभु"
```

**Root Causes:**

#### Cause A: Language code mismatch
**Check:** Backend language codes in `translator_api.py`:

```python
LANG_CODE_MAP = {
    "hindi":     "hin_Deva",  # ✓ Correct
    "tamil":     "tam_Taml",  # ✓ Correct
    "telugu":    "tel_Telu",  # ✗ WRONG (should be "tel_Telu"?)
}
```

**Verify:** https://github.com/ai4bharat/IndicTrans2

#### Cause B: Encoding issues (UTF-8)
**Check:** Response headers in browser DevTools:
```
Content-Type: application/json; charset=utf-8
```

**If missing charset, add to backend:**
```python
from fastapi.responses import JSONResponse

return JSONResponse(
    content=response_data,
    media_type="application/json; charset=utf-8"
)
```

#### Cause C: Text not properly preprocessed
**Check logs:**
```
[IndicProcessor] Preprocessing batch...
[IndicProcessor] Language tags: hin_Deva
```

**If wrong language tags, verify:**
```python
# In batch_translate_chunk():
batch_preprocessed = ip.preprocess_batch(
    batch,
    src_lang=SRC_LANG,      # Should be "eng_Latn"
    tgt_lang=tgt_lang       # Should be "hin_Deva" etc.
)
```

---

### Issue 5: "Backend Server Not Responding" 🔌

**Symptoms:**
```
Translation server offline. Start: python translator_api.py
```

**Root Causes:**

#### Cause A: Server crashed
**Check:**
```bash
# Terminal: See if server is running
ps aux | grep "translator_api.py"

# Try restarting:
python translator_api.py
```

**Check errors in output:**
```
Traceback (most recent call last):
  File "translator_api.py", line X, in ...
```

**Common error:** Port 8000 already in use
```bash
# Fix:
lsof -i :8000  # See what's using port 8000
kill -9 <PID>  # Kill it

python translator_api.py  # Start again
```

#### Cause B: Wrong URL in frontend
**Check:** Request URL in browser DevTools Network tab:
```
POST /api/translate-stream  ← Should be this
GET http://localhost:8000/api/translate-stream  ← Or full URL
```

**Fix:** Ensure frontend points to correct port:
```typescript
// In translationService.ts:
const response = await fetch("/api/translate-stream", {  // ✓ Correct
  // OR
const response = await fetch("http://localhost:8000/api/translate-stream", {  // Also OK
```

#### Cause C: CORS blocked
**Check:** Browser console:
```
Access to XMLHttpRequest at 'http://localhost:8000/...' from 'http://localhost:5173'
blocked by CORS policy
```

**Fix:** Verify CORS middleware in `translator_api.py`:
```python
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"  # Allow all
    return response
```

---

### Issue 6: "Progress Always Shows 0%" 🔄

**Symptoms:**
```
Progress bar stuck at 0%
onProgress() called but progress = 0
```

**Root Cause:** Response format error

**Check:** Backend response format:
```python
# CORRECT:
{
  "chunk_id": 0,
  "total_chunks": 5,
  "progress": 20,  # ← This field
  "translated_nodes": [...],
  "done": false
}

# WRONG:
{
  "percent": 20,  # ← Wrong field name
  "translated_nodes": [...]
}
```

**Fix:** Ensure `/api/translate-stream` endpoint returns correct JSON structure from line ~180-220 in `BACKEND_OPTIMIZATION_CODE.py`

---

## 🧪 DIAGNOSTIC TESTS

### Test 1: Is GPU available?
```bash
python -c "import torch; print('GPU:', torch.cuda.is_available())"
# Output: GPU: True  ← Good
# Output: GPU: False ← Problem
```

### Test 2: Can model translate?
```python
# test_quick.py
from translator_api import batch_translate_chunk
result = batch_translate_chunk(
    ["Hello world", "How are you"],
    "hin_Deva",
    chunk_id=0
)
print(result)
# Should print Hindi translations
```

### Test 3: Are endpoints responding?
```bash
# Test direct endpoint
curl http://localhost:8000/health
# Should return: {"status": "running", ...}

# Test chunk endpoint
curl -X POST http://localhost:8000/api/translate-chunk \
  -H "Content-Type: application/json" \
  -d '{"text_nodes": ["Hello"], "target_lang": "hindi", "chunk_id": 0, "total_chunks": 1}'
```

### Test 4: Is streaming working?
```bash
# Test streaming endpoint
curl -N -X POST http://localhost:8000/api/translate-stream \
  -H "Content-Type: application/json" \
  -d '{
    "text_nodes": ["sentence 1", "sentence 2", "sentence 3"],
    "target_lang": "hindi",
    "chunk_size": 2
  }'

# Should stream results line by line:
# {"chunk_id": 0, ...}
# {"chunk_id": 1, ...}
```

### Test 5: Frontend code correct?
```typescript
// In browser console:
import { translateArticle } from './services/translationService';

translateArticle('<p>Hello</p>', 'hindi', (update) => {
  console.log('Progress:', update.progress);
}).then(result => {
  console.log('Final result:', result);
});
```

---

## 🆘 ESCALATION

If you've tried all above and still have issues:

### Collect Debug Info:
```bash
# Backend logs
python -u translator_api.py > backend.log 2>&1

# Frontend logs (browser DevTools console)
# Copy entire Network tab after translation fails

# System info
python -c "
import torch
import sys
print('Python:', sys.version)
print('PyTorch:', torch.__version__)
print('CUDA:', torch.cuda.is_available())
print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')
"
```

### Then check:
1. Is GPU actually being used? (nvidia-smi shows usage)
2. Are both endpoints accessible? (curl tests pass)
3. Small articles work but large ones fail? (likely memory)
4. All articles fail? (likely server/model issue)

---

## 📋 VERIFICATION CHECKLIST

- [ ] `python translator_api.py` starts without errors
- [ ] `npm run build` completes successfully  
- [ ] Small article (2K) translates in <5 seconds
- [ ] Medium article (5K) translates in <10 seconds
- [ ] Large article (10K) shows progress updates
- [ ] No "Translation timed out" errors
- [ ] No OOM (out of memory) errors
- [ ] UI progress bar updates smoothly
- [ ] GPU utilization >50% during translation (on GPU)
- [ ] No CORS errors in browser console

---

**Still stuck?** Create a test file with minimal reproducible example and share the:
1. Error message (exact text)
2. Backend logs
3. Browser console output
4. System info (GPU type, RAM, etc.)
