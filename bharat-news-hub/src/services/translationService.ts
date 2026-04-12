/**
 * Translation Service for Bharat News
 * =====================================
 * Calls the local Python translation server (translator_api.py)
 * which uses Google Translate to translate article HTML into Indian languages.
 *
 * The server preserves all HTML tags, inline styles, and structure while
 * translating only the visible text content.
 */

export interface TranslationResult {
  translatedHtml: string;
  engine: string;
  success: boolean;
  error?: string;
}

/**
 * Translate article HTML to the target Indian language via the local Python server.
 *
 * @param htmlContent  - The AI-generated article HTML
 * @param targetLang   - Language key (e.g. "hindi", "tamil", "telugu")
 * @param onProgress   - Optional callback for progress tracking
 */
export async function translateArticle(
  htmlContent: string,
  targetLang: string,
  onProgress?: (done: number, total: number) => void
): Promise<TranslationResult> {
  try {
    onProgress?.(0, 1);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout for CPU translation

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html_content: htmlContent,
        target_lang: targetLang,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Translation server returned ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    onProgress?.(1, 1);

    if (data.success && data.translated_html) {
      console.log(`[Translation] ✅ Success via ${data.engine}`);
      return {
        translatedHtml: data.translated_html,
        engine: data.engine || "Google Translate",
        success: true,
      };
    } else {
      return {
        translatedHtml: htmlContent,
        engine: data.engine || "Unknown",
        success: false,
        error: data.error || "Translation returned empty result.",
      };
    }
  } catch (err: any) {
    console.error("[Translation] Failed:", err);

    // Give a helpful error message
    let errorMsg = err.message || "Translation failed";
    if (err.name === "AbortError") {
      errorMsg = "Translation timed out. The article may be too long.";
    } else if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
      errorMsg = "Translation server is not running. Please start it with: python translator_api.py";
    } else if (err.message?.includes("502") || err.message?.includes("503")) {
      errorMsg = "Translation server is not running. Please start it with: python translator_api.py";
    }

    return {
      translatedHtml: htmlContent,
      engine: "None",
      success: false,
      error: errorMsg,
    };
  }
}
