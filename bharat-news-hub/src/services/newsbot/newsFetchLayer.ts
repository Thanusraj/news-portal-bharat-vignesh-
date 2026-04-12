/**
 * News Fetch Layer — Multi-source article fetching
 * 
 * Reuses existing newsApi.ts infrastructure (GNews key rotation, NewsAPI, caching, dedup)
 * and exposes a clean pipeline-friendly interface.
 */

import { searchNews, fetchTopHeadlines, type NewsArticle } from "@/services/newsApi";
import type { ParsedQuery } from "@/types/newsBot.types";

export interface FetchedArticle {
  title: string;
  description: string;
  content: string;       // snippet from API
  url: string;
  image: string | null;
  publishedAt: string;
  sourceName: string;
}

/**
 * Convert internal NewsArticle to pipeline-friendly FetchedArticle
 */
function toFetchedArticle(article: NewsArticle): FetchedArticle {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    image: article.image,
    publishedAt: article.publishedAt,
    sourceName: article.source?.name || "Unknown",
  };
}

/**
 * Deduplicate articles by URL and similar titles
 */
function deduplicateArticles(articles: FetchedArticle[]): FetchedArticle[] {
  const seen = new Set<string>();
  const seenTitles = new Set<string>();

  return articles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    
    // Check for similar titles (lowercase, remove punctuation)
    const normalizedTitle = a.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (seenTitles.has(normalizedTitle)) return false;

    seen.add(a.url);
    seenTitles.add(normalizedTitle);
    return true;
  });
}

/**
 * Fetch news articles based on the parsed query.
 * Uses GNews (primary) + NewsAPI (secondary) via the existing newsApi.ts infrastructure.
 * Returns deduplicated, sorted articles limited to top 5-8.
 */
export async function fetchNewsForQuery(
  parsedQuery: ParsedQuery,
  maxArticles: number = 8
): Promise<FetchedArticle[]> {
  const steps: string[] = [];

  try {
    console.log(`[News Fetch] Searching for: "${parsedQuery.searchQuery}"`);

    // Launch parallel fetches via existing infrastructure
    const results = await Promise.allSettled([
      searchNews(parsedQuery.searchQuery, maxArticles, "en", "in"),
      // If we have specific keywords, also try a broader search
      parsedQuery.keywords.length > 1
        ? searchNews(parsedQuery.keywords.slice(0, 3).join(" "), maxArticles, "en", "in")
        : Promise.resolve([]),
    ]);

    const allArticles: FetchedArticle[] = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allArticles.push(...result.value.map(toFetchedArticle));
      }
    }

    // If no search results, try top headlines as fallback
    if (allArticles.length === 0) {
      console.log("[News Fetch] No search results, trying top headlines...");
      try {
        const headlines = await fetchTopHeadlines("en", "in", maxArticles, "fast");
        allArticles.push(...headlines.map(toFetchedArticle));
      } catch {
        console.warn("[News Fetch] Headlines fallback also failed");
      }
    }

    // Deduplicate and limit
    const deduplicated = deduplicateArticles(allArticles);
    
    // Sort by recency
    deduplicated.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const finalArticles = deduplicated.slice(0, maxArticles);
    console.log(`[News Fetch] Returning ${finalArticles.length} articles`);

    return finalArticles;
  } catch (err) {
    console.error("[News Fetch] All fetches failed:", err);
    return [];
  }
}
