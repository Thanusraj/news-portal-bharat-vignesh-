/**
 * Content Extractor — Full article scraping + Wikipedia context
 * 
 * ALWAYS scrapes articles (high priority) and fetches Wikipedia
 * context for factual grounding. This is the key accuracy layer.
 */

import { fetchFullArticle } from "@/services/scraperApi";
import type { FetchedArticle } from "./newsFetchLayer";

export interface EnrichedArticle extends FetchedArticle {
  fullContent?: string;  // Full scraped article text
  scraped: boolean;      // Whether scraping was successful
}

export interface WikiContext {
  title: string;
  extract: string;
  url: string;
}

/**
 * Fetch Wikipedia summaries relevant to the query.
 * Uses the Wikipedia REST API (no key needed, no CORS issues with origin=*).
 */
export async function fetchWikipediaContext(
  searchQuery: string,
  maxResults: number = 3
): Promise<WikiContext[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Step 1: Search for matching articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*&srlimit=${maxResults}`;
    const searchRes = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!searchRes.ok) throw new Error(`Wikipedia search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];

    if (results.length === 0) {
      console.log("[Wikipedia] No results found for:", searchQuery);
      return [];
    }

    // Step 2: Fetch full extracts for the top results
    const titles = results.map((r: any) => r.title).join("|");
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*&exlimit=${maxResults}`;

    const extractController = new AbortController();
    const extractTimeoutId = setTimeout(() => extractController.abort(), 5000);

    const extractRes = await fetch(extractUrl, { signal: extractController.signal });
    clearTimeout(extractTimeoutId);

    if (!extractRes.ok) throw new Error(`Wikipedia extract failed: ${extractRes.status}`);
    const extractData = await extractRes.json();
    const pages = extractData.query?.pages || {};

    const wikiContexts: WikiContext[] = [];

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      if (page.missing !== undefined) continue;

      const extract = (page.extract || "").trim();
      if (extract.length < 30) continue; // Skip very short/stub articles

      wikiContexts.push({
        title: page.title,
        extract: extract.slice(0, 3000), // Limit extract size
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      });
    }

    console.log(`[Wikipedia] ✓ Found ${wikiContexts.length} relevant articles`);
    return wikiContexts;
  } catch (err) {
    console.warn("[Wikipedia] Fetch failed:", (err as Error).message);
    return [];
  }
}

/**
 * Extract full content from articles — ALWAYS runs (high priority).
 * 
 * Scrapes up to 5 articles for maximum accuracy.
 * Increased timeout tolerance to 6s per article.
 */
export async function extractFullContent(
  articles: FetchedArticle[],
  maxToScrape: number = 5
): Promise<EnrichedArticle[]> {
  const toScrape = articles.slice(0, maxToScrape);
  const remaining = articles.slice(maxToScrape);

  console.log(`[Content Extractor] Scraping ${toScrape.length} of ${articles.length} articles`);

  const scrapeResults = await Promise.allSettled(
    toScrape.map(async (article): Promise<EnrichedArticle> => {
      try {
        if (!article.url) throw new Error("No URL");

        const scraped = await fetchFullArticle(article.url);
        
        // Use textContent for AI processing (cleaner than HTML)
        const fullText = scraped.textContent || scraped.excerpt || "";

        if (fullText.length < 50) {
          throw new Error("Scraped content too short");
        }

        console.log(`[Content Extractor] ✓ Scraped: ${article.title.slice(0, 50)}... (${fullText.length} chars)`);

        return {
          ...article,
          fullContent: fullText.slice(0, 6000), // Increased limit for better accuracy
          scraped: true,
        };
      } catch (err) {
        console.warn(`[Content Extractor] ✗ Failed for: ${article.title.slice(0, 50)}...`, (err as Error).message);
        return {
          ...article,
          scraped: false,
        };
      }
    })
  );

  const enriched: EnrichedArticle[] = [];

  for (const result of scrapeResults) {
    if (result.status === "fulfilled") {
      enriched.push(result.value);
    }
  }

  // Add remaining articles as non-scraped
  for (const article of remaining) {
    enriched.push({ ...article, scraped: false });
  }

  const successCount = enriched.filter((a) => a.scraped).length;
  console.log(`[Content Extractor] ${successCount}/${toScrape.length} articles scraped successfully`);

  return enriched;
}
