/**
 * NewsBot Pipeline Orchestrator
 * 
 * ALWAYS runs: NLP → News Fetch → Scrape ALL articles → Wikipedia → AI Process
 * Scraping and Wikipedia are high priority for accuracy.
 */

import type { NewsResponse, ChatMessage } from "@/types/newsBot.types";
import { parseUserQuery } from "./nlpLayer";
import { fetchNewsForQuery } from "./newsFetchLayer";
import { extractFullContent, fetchWikipediaContext } from "./contentExtractor";
import { processArticlesWithAI, generateGreetingResponse } from "./aiProcessor";

/**
 * Main pipeline function — replaces sendNewsQueryGroq in the UI.
 * No API key parameter needed — everything loads from .env.
 */
export async function processNewsQuery(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<NewsResponse> {
  const processingSteps: string[] = [];
  const startTime = Date.now();

  console.log("═══════════════════════════════════════════");
  console.log("[Pipeline] Starting for:", userMessage);
  console.log("═══════════════════════════════════════════");

  // ── STEP 1: NLP — Understand the query ──────────────
  processingSteps.push("NLP: Query analyzed");
  const parsedQuery = await parseUserQuery(userMessage);
  console.log("[Pipeline] Intent:", parsedQuery.intent, "| Topic:", parsedQuery.topic);

  // ── SHORT-CIRCUIT: Greetings ────────────────────────
  if (parsedQuery.intent === "greeting") {
    console.log("[Pipeline] Greeting detected — responding directly");
    return generateGreetingResponse();
  }

  // ── STEP 2: Parallel fetch — News + Wikipedia ───────
  // Run news fetch AND Wikipedia in parallel for speed
  processingSteps.push("Fetch: Searching news + Wikipedia");
  console.log("[Pipeline] Launching parallel: News APIs + Wikipedia...");

  const [articles, wikiContext] = await Promise.all([
    fetchNewsForQuery(parsedQuery),
    fetchWikipediaContext(parsedQuery.topic || parsedQuery.searchQuery, 3),
  ]);

  console.log(`[Pipeline] Fetched ${articles.length} articles + ${wikiContext.length} Wikipedia refs`);
  processingSteps.push(`Fetch: ${articles.length} articles, ${wikiContext.length} wiki refs`);

  if (articles.length === 0 && wikiContext.length === 0) {
    processingSteps.push("Fetch: No data found — AI will use general knowledge");
  }

  // ── STEP 3: ALWAYS Scrape articles (high priority) ──
  let processableArticles = articles;

  if (articles.length > 0) {
    processingSteps.push("Scraper: Extracting full content (high priority)");
    console.log("[Pipeline] Scraping ALL top articles for accuracy...");
    const enriched = await extractFullContent(articles, 5); // Scrape up to 5

    const scrapedCount = enriched.filter((a) => a.scraped).length;
    processingSteps.push(`Scraper: ${scrapedCount}/${articles.length} articles fully scraped`);
    console.log(`[Pipeline] ${scrapedCount} articles scraped successfully`);

    processableArticles = enriched;
  } else {
    processingSteps.push("Scraper: Skipped (no articles to scrape)");
  }

  // ── STEP 4: AI Processing with all context ─────────
  processingSteps.push("AI: Generating accurate briefing");
  console.log("[Pipeline] Sending to AI processor with full context...");

  const newsResponse = await processArticlesWithAI(
    processableArticles,
    wikiContext,
    userMessage,
    conversationHistory
  );

  // ── Enrich response with pipeline metadata ─────────
  newsResponse.articleCount = articles.length;
  newsResponse.processingSteps = processingSteps;
  // Clear out sources and followUpSuggestions (removed from UI)
  newsResponse.sources = [];
  newsResponse.followUpSuggestions = [];

  const elapsed = Date.now() - startTime;
  console.log(`[Pipeline] ✓ Complete in ${elapsed}ms`);
  console.log("[Pipeline] Steps:", processingSteps);
  console.log("═══════════════════════════════════════════");

  return newsResponse;
}
