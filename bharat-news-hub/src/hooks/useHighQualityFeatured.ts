import { useState, useEffect, useRef } from "react";
import type { NewsArticle } from "@/services/newsApi";

const MIN_WIDTH = 400;
const MIN_HEIGHT = 250;

// Patterns that indicate low-quality or non-photo images
const BAD_URL = /\.(gif|svg|ico|bmp)$/i;
const BAD_PATTERN = /thumbnail|icon|logo|avatar|placeholder|spacer|pixel|blank|default|noimage|no-image|missing|1x1|2x2/i;

function isCandidate(article: NewsArticle): boolean {
  const url = article.image;
  if (!url) return false;
  if (url.length < 25) return false;
  if (url.startsWith("data:")) return false;
  if (BAD_URL.test(url)) return false;
  if (BAD_PATTERN.test(url)) return false;

  // Explicitly block sources known to use fake blurry letterboxing for their cover images
  const sourceName = article.source.name.toLowerCase();
  if (sourceName.includes("times of india") || sourceName === "toi") {
    return false;
  }

  return true;
}

/** Preload an image and resolve true only if it meets minimum resolution */
function validateImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      resolve(false);
    }, 4000); // 4s timeout

    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth >= MIN_WIDTH && img.naturalHeight >= MIN_HEIGHT);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Given a list of news articles, asynchronously find the first N articles
 * whose images are actually high-quality (>= 400x250 real pixels).
 * Returns them in order as they pass validation.
 */
export function useHighQualityFeatured(
  articles: NewsArticle[],
  count: number,
  loading: boolean
): { featured: NewsArticle[]; validating: boolean } {
  const [featured, setFeatured] = useState<NewsArticle[]>([]);
  const [validating, setValidating] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (loading || articles.length === 0) {
      setFeatured([]);
      return;
    }

    cancelRef.current = false;
    setValidating(true);

    // Filter candidates first
    const candidates = articles.filter(isCandidate);

    const run = async () => {
      const validated: NewsArticle[] = [];

      // Check up to 10 candidates to find the required count
      const toCheck = candidates.slice(0, Math.min(candidates.length, 10));

      // Validate in parallel batches of 3 for speed
      for (let i = 0; i < toCheck.length && validated.length < count; i += 3) {
        if (cancelRef.current) return;

        const batch = toCheck.slice(i, i + 3);
        const results = await Promise.all(
          batch.map((article) => validateImage(article.image!))
        );

        for (let j = 0; j < batch.length; j++) {
          if (cancelRef.current) return;
          if (results[j] && validated.length < count) {
            validated.push(batch[j]);
          }
        }
      }

      if (cancelRef.current) return;

      // If we didn't find enough validated images, fall back to URL-filtered candidates
      if (validated.length < count) {
        for (const c of candidates) {
          if (validated.length >= count) break;
          if (!validated.some((v) => v.url === c.url)) {
            validated.push(c);
          }
        }
      }

      // Last resort: just use the first articles even without images
      if (validated.length < count) {
        for (const a of articles) {
          if (validated.length >= count) break;
          if (!validated.some((v) => v.url === a.url)) {
            validated.push(a);
          }
        }
      }

      if (!cancelRef.current) {
        setFeatured(validated);
        setValidating(false);
      }
    };

    void run();

    return () => {
      cancelRef.current = true;
    };
  }, [articles, count, loading]);

  return { featured, validating };
}
