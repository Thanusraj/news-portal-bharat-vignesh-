const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";
const fallbackCache = new Map<string, string>();
const inFlightFallback = new Map<string, Promise<string>>();
export const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=800&q=80";

async function fetchRemoteFallback(normalizedKeyword: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(normalizedKeyword)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    if (!res.ok) throw new Error("Unsplash error");
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const selected = data.results[0].urls.regular as string;
      fallbackCache.set(normalizedKeyword, selected);
      return selected;
    }
  } catch (e) {
    console.error("Unsplash fallback error:", e);
  }
  fallbackCache.set(normalizedKeyword, DEFAULT_FALLBACK);
  return DEFAULT_FALLBACK;
}

export async function getFallbackImage(keyword: string): Promise<string> {
  const normalizedKeyword = keyword.trim().toLowerCase() || "news";
  const cached = fallbackCache.get(normalizedKeyword);
  if (cached) return cached;

  const inflight = inFlightFallback.get(normalizedKeyword);
  if (inflight) return inflight;

  const promise = fetchRemoteFallback(normalizedKeyword).finally(() => {
    inFlightFallback.delete(normalizedKeyword);
  });
  inFlightFallback.set(normalizedKeyword, promise);
  return promise;
}

// Returns immediately with a deterministic placeholder, then upgrades to a keyword-specific image in the background.
export function getFallbackImageFast(keyword: string): { placeholder: string; upgrade: Promise<string> } {
  const normalizedKeyword = keyword.trim().toLowerCase() || "news";
  const cached = fallbackCache.get(normalizedKeyword);
  if (cached) {
    return { placeholder: cached, upgrade: Promise.resolve(cached) };
  }

  const inflight = inFlightFallback.get(normalizedKeyword);
  if (inflight) {
    return { placeholder: DEFAULT_FALLBACK, upgrade: inflight };
  }

  const upgrade = getFallbackImage(keyword);
  return { placeholder: DEFAULT_FALLBACK, upgrade };
}

export function getUnsplashUrl(keyword: string): string {
  return `https://source.unsplash.com/800x450/?${encodeURIComponent(keyword)}`;
}
