/**
 * Translation Service for Bharat News — HYBRID ENGINE
 * =====================================================
 * Priority: Memory Cache → Google Translate (~1-3s) → IndicTrans2 (local fallback)
 *
 * Google Translate is the primary engine for speed.
 * IndicTrans2 kicks in only if Google is unavailable (offline, blocked, etc.)
 * Time taken is measured and returned to the UI.
 */

export interface TranslationResult {
  translatedHtml: string;
  engine: string;
  success: boolean;
  error?: string;
  /** Wall-clock time from request start to result, in milliseconds. */
  timeTakenMs: number;
}

// ── Language code maps ──────────────────────────────────────
const GOOGLE_LANG_CODES: Record<string, string> = {
  hindi: "hi",
  tamil: "ta",
  telugu: "te",
  bengali: "bn",
  marathi: "mr",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
};

// ── In-memory translation cache ─────────────────────────────
const translationCache = new Map<string, Map<string, string>>();

// ── Timeouts ────────────────────────────────────────────────
const GOOGLE_TIMEOUT_MS = 15_000;
const INDICTRANS_TIMEOUT_MS = 90_000;
/** Max parallel Google Translate requests at a time */
const GOOGLE_CONCURRENCY = 6;

// =============================================================
// PUBLIC API
// =============================================================

/**
 * Translate an article's HTML content to the target language.
 * Uses a hybrid approach: tries Google Translate first (fast),
 * falls back to IndicTrans2 local server if Google fails.
 */
export async function translateArticle(
  htmlContent: string,
  targetLang: string,
  onProgress?: (done: number, total: number) => void
): Promise<TranslationResult> {
  const t0 = performance.now();

  try {
    // ── 1. Cache lookup ──
    if (!translationCache.has(htmlContent)) {
      translationCache.set(htmlContent, new Map());
    }
    const cache = translationCache.get(htmlContent)!;

    if (cache.has(targetLang)) {
      console.log(`[Translation] ✅ Cache hit for "${targetLang}"`);
      onProgress?.(1, 1);
      return success(cache.get(targetLang)!, "Cache (instant)", t0);
    }

    // ── 2. Extract translatable text nodes ──
    const textNodes = extractTextNodes(htmlContent);
    if (textNodes.length === 0) {
      onProgress?.(1, 1);
      return success(htmlContent, "None (no text)", t0);
    }

    console.log(`[Translation] ${textNodes.length} text nodes to translate → "${targetLang}"`);
    onProgress?.(0, 1);

    // ── 3. Hybrid translate ──
    let translated: string[];
    let engine: string;

    try {
      console.log("[Translation] Trying Google Translate (fast)…");
      translated = await translateViaGoogle(textNodes, targetLang);
      engine = "Google Translate";
      console.log("[Translation] ✅ Google Translate succeeded");
    } catch (googleErr: any) {
      console.warn("[Translation] Google Translate failed:", googleErr.message);

      try {
        console.log("[Translation] Falling back to IndicTrans2 local server…");
        translated = await translateViaIndicTrans(textNodes, targetLang);
        engine = "IndicTrans2 (local)";
        console.log("[Translation] ✅ IndicTrans2 succeeded");
      } catch (indicErr: any) {
        throw new Error(
          `All engines failed.\n• Google: ${googleErr.message}\n• IndicTrans2: ${indicErr.message}`
        );
      }
    }

    // ── 4. Rebuild HTML with translations ──
    const translatedHtml = rebuildHtmlWithTranslations(htmlContent, textNodes, translated);
    cache.set(targetLang, translatedHtml);
    onProgress?.(1, 1);

    return success(translatedHtml, engine, t0);
  } catch (err: any) {
    console.error("[Translation] Failed:", err);
    return {
      translatedHtml: htmlContent,
      engine: "None",
      success: false,
      error: err.message || "Translation failed",
      timeTakenMs: elapsed(t0),
    };
  }
}

// =============================================================
// HELPERS
// =============================================================

function success(html: string, engine: string, t0: number): TranslationResult {
  return { translatedHtml: html, engine, success: true, timeTakenMs: elapsed(t0) };
}

function elapsed(t0: number): number {
  return Math.round(performance.now() - t0);
}

// =============================================================
// ENGINE 1 — Google Translate (fast, free, ~1-3 seconds)
// =============================================================

/**
 * Translate all text nodes via Google Translate in parallel.
 * Uses the free `translate.googleapis.com` endpoint proxied through Vite.
 */
async function translateViaGoogle(
  textNodes: string[],
  targetLang: string
): Promise<string[]> {
  const tl = GOOGLE_LANG_CODES[targetLang];
  if (!tl) throw new Error(`Unsupported language for Google: ${targetLang}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);

  try {
    // Translate with concurrency limiter to avoid hammering
    const results = await parallelMap(
      textNodes,
      (text) => googleTranslateOne(text, tl, controller.signal),
      GOOGLE_CONCURRENCY
    );
    return results;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Translate a single text string via Google Translate.
 */
async function googleTranslateOne(
  text: string,
  tl: string,
  signal: AbortSignal
): Promise<string> {
  const q = encodeURIComponent(text);
  const url = `/api/gtranslate?client=gtx&sl=en&tl=${tl}&dt=t&q=${q}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Google HTTP ${res.status}`);

  const data = await res.json();

  // Google response shape: [[["translated","original",…], …], null, "en", …]
  if (Array.isArray(data?.[0])) {
    const translated = (data[0] as any[][])
      .filter(Array.isArray)
      .map((seg) => (seg[0] as string) || "")
      .join("");
    if (translated) return translated;
  }

  throw new Error("Unexpected Google Translate response format");
}

// =============================================================
// ENGINE 2 — IndicTrans2 Local Server (fallback for offline)
// =============================================================

/**
 * Translate text nodes via the local IndicTrans2 Python server.
 * This is the slow path (~1-2 min on CPU) used only if Google is unavailable.
 */
async function translateViaIndicTrans(
  textNodes: string[],
  targetLang: string
): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INDICTRANS_TIMEOUT_MS);

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text_nodes: textNodes,
        target_lang: String(targetLang).trim(),
      }),
      signal: controller.signal,
    });

    const raw = await res.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`IndicTrans2 returned non-JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
    }

    if (!res.ok) {
      throw new Error(
        `IndicTrans2 server error ${res.status}: ${data?.error || raw.slice(0, 200)}`
      );
    }

    if (data.success === false) {
      throw new Error(data.error || "IndicTrans2 returned success=false");
    }

    if (!Array.isArray(data.translated_nodes)) {
      throw new Error("IndicTrans2 response missing translated_nodes array");
    }

    return data.translated_nodes as string[];
  } finally {
    clearTimeout(timeout);
  }
}

// =============================================================
// HTML TEXT EXTRACTION & REBUILD
// =============================================================

/**
 * Extract visible text nodes from HTML (skip scripts, styles, etc.)
 */
function extractTextNodes(html: string): string[] {
  if (typeof DOMParser === "undefined") {
    // SSR / Node fallback
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    return cleaned
      .split(/<[^>]+>/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 3 && !/^\d+$/.test(t));
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: string[] = [];
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim() || "";
    if (text.length > 3 && !/^\d+$/.test(text)) {
      nodes.push(text);
    }
    node = walker.nextNode();
  }
  return nodes;
}

/**
 * Replace original English text nodes in HTML with translated text.
 * Processes in reverse order to preserve character positions.
 */
function rebuildHtmlWithTranslations(
  originalHtml: string,
  originalNodes: string[],
  translatedNodes: string[]
): string {
  let result = originalHtml;
  let offset = 0;

  const positions: Array<{ pos: number; original: string; translated: string }> = [];
  for (let i = 0; i < originalNodes.length && i < translatedNodes.length; i++) {
    const pos = originalHtml.indexOf(originalNodes[i], offset);
    if (pos !== -1) {
      positions.push({ pos, original: originalNodes[i], translated: translatedNodes[i] });
      offset = pos + originalNodes[i].length;
    }
  }

  for (let i = positions.length - 1; i >= 0; i--) {
    const { pos, original, translated } = positions[i];
    result = result.substring(0, pos) + translated + result.substring(pos + original.length);
  }

  return result;
}

// =============================================================
// UTILITY — Parallel map with concurrency limit
// =============================================================

/**
 * Map over items with a concurrency limit.
 * e.g. parallelMap(items, fn, 6) runs at most 6 fn() calls at once.
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
