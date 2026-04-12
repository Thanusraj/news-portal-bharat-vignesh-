/**
 * NLP Layer — Query Understanding via Groq
 * 
 * Parses user's raw query into a structured ParsedQuery object
 * using Groq's Llama 3.3 with JSON mode for reliable parsing.
 */

import type { ParsedQuery } from "@/types/newsBot.types";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const NLP_SYSTEM_PROMPT = `You are a news query classifier. Analyze the user's message and output a JSON object with these fields:

{
  "intent": one of "news_fetch" | "explanation" | "summary" | "greeting" | "followup",
  "topic": the main topic the user is asking about (string),
  "keywords": array of 2-5 search keywords extracted from the query,
  "entities": array of named entities (people, organizations, places) mentioned,
  "category": one of "Politics" | "Business" | "Technology" | "Sports" | "Science" | "World" | "India" | "Markets" | "Health" | "Entertainment" or null,
  "requiresDeepContent": boolean — true if the query asks for explanation, analysis, deep dive, or detailed understanding,
  "searchQuery": a refined, optimized search query string for news APIs (remove filler words, keep core topic)
}

Rules:
- "greeting" intent: for messages like "hi", "hello", "hey", "thanks", "bye", general chitchat
- "news_fetch" intent: for simple news queries like "latest cricket", "stock market today"
- "explanation" intent: for queries needing deep analysis like "explain RBI policy impact", "why is inflation rising"
- "summary" intent: for queries asking to summarize or brief on a topic
- "followup" intent: for short follow-up messages that refer to previous context like "tell me more", "what about...", "and the impact?"
- requiresDeepContent should be true only for "explanation" intent or when user explicitly asks for details/analysis
- searchQuery should be concise and optimized for Google News search (2-6 words)

Output ONLY valid JSON. No explanations.`;

/**
 * Parse a user message into a structured query using Groq LLM.
 * Falls back to a simple keyword-based parse if the API call fails.
 */
export async function parseUserQuery(userMessage: string): Promise<ParsedQuery> {
  // Fast-path: detect obvious greetings without API call
  const greetings = /^(hi|hello|hey|sup|thanks|thank you|bye|good morning|good evening|howdy|yo)\b/i;
  if (greetings.test(userMessage.trim())) {
    return {
      intent: "greeting",
      topic: "",
      keywords: [],
      entities: [],
      category: null,
      requiresDeepContent: false,
      searchQuery: "",
    };
  }

  try {
    if (!GROQ_API_KEY) throw new Error("No Groq API key");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

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
          { role: "system", content: NLP_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Groq NLP error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    console.log("[NLP Layer] Parsed query:", parsed);

    return {
      intent: parsed.intent || "news_fetch",
      topic: parsed.topic || userMessage,
      keywords: parsed.keywords || [userMessage],
      entities: parsed.entities || [],
      category: parsed.category || null,
      requiresDeepContent: parsed.requiresDeepContent || false,
      searchQuery: parsed.searchQuery || userMessage,
    };
  } catch (err) {
    console.warn("[NLP Layer] Groq parse failed, using fallback:", err);
    return fallbackParse(userMessage);
  }
}

/** Simple keyword-based fallback if NLP API fails */
function fallbackParse(message: string): ParsedQuery {
  const lower = message.toLowerCase();

  // Detect follow-up patterns
  const followUpPatterns = /^(tell me more|what about|and |also |more on|continue|go on|elaborate)/i;
  if (followUpPatterns.test(lower)) {
    return {
      intent: "followup",
      topic: message,
      keywords: message.split(/\s+/).filter((w) => w.length > 2),
      entities: [],
      category: null,
      requiresDeepContent: false,
      searchQuery: message,
    };
  }

  // Detect explanation-type queries
  const explainPatterns = /\b(explain|why|how does|impact|analysis|deep dive|understand|reason)\b/i;
  const isExplanation = explainPatterns.test(lower);

  return {
    intent: isExplanation ? "explanation" : "news_fetch",
    topic: message,
    keywords: message.split(/\s+/).filter((w) => w.length > 2).slice(0, 5),
    entities: [],
    category: null,
    requiresDeepContent: isExplanation,
    searchQuery: message,
  };
}
