/**
 * AI Processor — Accuracy-focused with Groq Primary + OpenRouter Fallback
 * 
 * Takes scraped articles + Wikipedia context and produces
 * the final structured NewsResponse grounded in real data.
 */

import type { NewsResponse, ChatMessage } from "@/types/newsBot.types";
import type { EnrichedArticle, WikiContext } from "./contentExtractor";
import type { FetchedArticle } from "./newsFetchLayer";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

const AI_SYSTEM_PROMPT = `You are BharatNews AI — a highly accurate, fact-driven news analyst.

You have been given:
1. REAL news articles scraped from live sources (some with full article text)
2. Wikipedia background context for factual grounding

YOUR #1 PRIORITY IS ACCURACY. Every claim you make must be traceable to the provided data.

Reply with ONLY a valid JSON object:
{
  "headline": "A factual, specific headline based on the most significant finding from the articles. Include specific names, numbers, or dates when available. 8-14 words.",
  "summary": "A 3-4 sentence thorough summary that synthesizes the KEY FACTS from the scraped articles. Include specific numbers, dates, names, and outcomes. Do not generalize — be precise. If articles contain contradicting information, note both sides.",
  "keyPoints": ["5-7 bullet points. Each MUST contain a specific fact — a number, a name, a date, a quote, or a measurable outcome extracted directly from the provided articles. Never write vague points like 'the situation is evolving'."],
  "sentiment": "positive | negative | neutral | mixed",
  "category": "Politics | Business | Technology | Sports | Science | World | India | Markets | Health | Entertainment",
  "breaking": false
}

STRICT ACCURACY RULES:
- ONLY state facts that appear in the provided articles or Wikipedia context
- If you don't have enough data to answer accurately, say "Based on available reports..." and stick to what the articles say
- Include specific numbers, percentages, scores, dates, names from the articles
- For sports: include scores, player names, match details
- For finance: include stock prices, percentage changes, index values
- For politics: include specific policy names, vote counts, official statements
- keyPoints must be 5-7 items, each a concrete, verifiable fact
- DO NOT fabricate sources, statistics, or quotes
- DO NOT include "sources" or "followUpSuggestions" fields — they are not needed
- Maintain conversation context for follow-up questions`;

/**
 * Format articles + Wikipedia into a rich context string for the AI
 */
function formatContext(
  articles: (FetchedArticle | EnrichedArticle)[],
  wikiContext: WikiContext[] = []
): string {
  let context = "";

  // Articles with full scraped content first (highest priority)
  const scraped = articles.filter((a) => "scraped" in a && (a as EnrichedArticle).scraped);
  const unscraped = articles.filter((a) => !("scraped" in a) || !(a as EnrichedArticle).scraped);

  if (scraped.length > 0) {
    context += "═══ SCRAPED FULL ARTICLES (HIGH RELIABILITY — use these as primary source) ═══\n\n";
    scraped.forEach((article, i) => {
      const enriched = article as EnrichedArticle;
      context += `[Scraped Article ${i + 1}]
Title: ${article.title}
Source: ${article.sourceName}
Published: ${article.publishedAt}
Full Text:
${enriched.fullContent || article.description || "N/A"}

---

`;
    });
  }

  if (unscraped.length > 0) {
    context += "═══ API ARTICLE SNIPPETS (supplementary) ═══\n\n";
    unscraped.forEach((article, i) => {
      context += `[Snippet ${i + 1}]
Title: ${article.title}
Source: ${article.sourceName}
Published: ${article.publishedAt}
Description: ${article.description}
Content: ${article.content || "N/A"}

---

`;
    });
  }

  if (wikiContext.length > 0) {
    context += "═══ WIKIPEDIA BACKGROUND CONTEXT (for factual grounding) ═══\n\n";
    wikiContext.forEach((wiki, i) => {
      context += `[Wikipedia: ${wiki.title}]
${wiki.extract}

---

`;
    });
  }

  return context;
}

/**
 * Build conversation history for context
 */
function buildHistory(conversationHistory: ChatMessage[]): { role: string; content: string }[] {
  return conversationHistory
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.parsed
          ? `[Previous briefing on: ${m.parsed.headline}]`
          : m.content,
    }));
}

/**
 * Process with Groq (primary — fast + accurate)
 */
async function processWithGroq(
  articles: (FetchedArticle | EnrichedArticle)[],
  wikiContext: WikiContext[],
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<NewsResponse> {
  if (!GROQ_API_KEY) throw new Error("No Groq API key configured");

  const context = formatContext(articles, wikiContext);
  const history = buildHistory(conversationHistory);

  const scrapedCount = articles.filter((a) => "scraped" in a && (a as EnrichedArticle).scraped).length;
  const userContent = `User Query: "${userMessage}"

Data available: ${articles.length} articles (${scrapedCount} fully scraped), ${wikiContext.length} Wikipedia references.

${context}

Analyze ALL the above data thoroughly and produce an ACCURATE news briefing as JSON. Prioritize the scraped full articles for facts.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for deeper analysis

  try {
    const response = await fetch("/api/groq/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userContent },
        ],
        temperature: 0.15,  // Very low for accuracy
        max_tokens: 1500,   // More room for detailed response
        response_format: { type: "json_object" },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq AI error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    console.log("[AI Processor] Groq response received");
    return JSON.parse(raw) as NewsResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Process with OpenRouter (fallback)
 */
async function processWithOpenRouter(
  articles: (FetchedArticle | EnrichedArticle)[],
  wikiContext: WikiContext[],
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<NewsResponse> {
  if (!OPENROUTER_API_KEY) throw new Error("No OpenRouter API key configured");

  const context = formatContext(articles, wikiContext);
  const history = buildHistory(conversationHistory);

  const scrapedCount = articles.filter((a) => "scraped" in a && (a as EnrichedArticle).scraped).length;
  const userContent = `User Query: "${userMessage}"

Data: ${articles.length} articles (${scrapedCount} scraped), ${wikiContext.length} Wikipedia references.

${context}

Produce an accurate news briefing as JSON. Use ONLY facts from the above data.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log("[AI Processor] Falling back to OpenRouter...");

    const response = await fetch("/api/openrouter/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Bharat News",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userContent },
        ],
        temperature: 0.15,
        max_tokens: 1500,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter AI error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in OpenRouter response");

    console.log("[AI Processor] OpenRouter fallback succeeded");
    return JSON.parse(jsonMatch[0]) as NewsResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Main AI processing — Groq primary + OpenRouter fallback.
 * Now accepts Wikipedia context for grounding.
 */
export async function processArticlesWithAI(
  articles: (FetchedArticle | EnrichedArticle)[],
  wikiContext: WikiContext[],
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<NewsResponse> {
  // Try Groq first
  try {
    return await processWithGroq(articles, wikiContext, userMessage, conversationHistory);
  } catch (groqErr) {
    console.warn("[AI Processor] Groq failed:", (groqErr as Error).message);
  }

  // Fallback to OpenRouter
  try {
    return await processWithOpenRouter(articles, wikiContext, userMessage, conversationHistory);
  } catch (orErr) {
    console.error("[AI Processor] OpenRouter fallback also failed:", (orErr as Error).message);
    throw new Error("All AI providers failed. Please try again later.");
  }
}

/**
 * Generate a direct greeting response without fetching news.
 */
export function generateGreetingResponse(): NewsResponse {
  return {
    headline: "Welcome to BharatNews AI",
    summary:
      "Hello! I'm your AI news correspondent. Ask me about any topic — from Indian politics and markets to global tech and science — and I'll fetch live articles, scrape full content, cross-reference with Wikipedia, and deliver an accurate briefing in seconds.",
    keyPoints: [
      "I scrape full article content from news sources for maximum accuracy",
      "Wikipedia background context is used for factual grounding",
      "Multiple APIs (GNews, NewsAPI, NewsData) ensure broad coverage",
      "Ask anything: 'IPL 2026 scores', 'explain SEBI regulations', 'AI news today'",
    ],
    sentiment: "positive",
    sources: [],
    followUpSuggestions: [],
    category: "India",
    breaking: false,
    articleCount: 0,
    processingSteps: ["greeting"],
  };
}
