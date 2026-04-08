import type { NewsResponse, ChatMessage } from "../types/newsBot.types";

const SYSTEM_PROMPT = `You are BharatNews AI — an elite AI news correspondent specializing in India and global affairs.
Your responses are always structured, professional, and journalistic.

ALWAYS reply with ONLY a valid JSON object (no markdown fences, no preamble, no explanation outside JSON):
{
  "headline": "A compelling AP/Reuters-style headline in title case, 10-15 words",
  "summary": "2-3 sentence professional news summary with key facts, dates, and actors. Write like a senior journalist.",
  "keyPoints": ["4-6 concise bullet points. Each must be a complete fact with context, not vague."],
  "sentiment": "positive | negative | neutral | mixed",
  "sources": ["3-5 real credible source names relevant to the topic — e.g. Reuters, NDTV, The Hindu, Economic Times, Bloomberg, BBC, ANI, PTI, AP, WSJ"],
  "followUpSuggestions": ["3 natural follow-up questions the reader would genuinely want to know"],
  "category": "Politics | Business | Technology | Sports | Science | World | India | Markets | Health",
  "breaking": false
}

Tone & style rules:
- Write like a BBC/Reuters correspondent — authoritative, balanced, factual
- For Indian topics: prioritize Indian sources (NDTV, The Hindu, Economic Times, ANI, PTI, Mint)
- For global topics: use international sources (Reuters, AP, BBC, Bloomberg, NYT, FT)
- keyPoints should be concrete facts, numbers, names — not vague statements
- followUpSuggestions should feel like natural conversation, not generic
- If it's genuinely breaking/urgent news, set "breaking": true
- Maintain conversation context for follow-up questions`;

export async function sendNewsQuery(
  userMessage: string,
  conversationHistory: ChatMessage[],
  apiKey: string
): Promise<NewsResponse> {
  const history = conversationHistory
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
    .slice(-6)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.role === "assistant" && m.parsed
          ? `[Previous briefing on: ${m.parsed.headline}]`
          : m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text || "{}";

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");
    const parsed: NewsResponse = JSON.parse(match[0]);
    return parsed;
  } catch {
    throw new Error("Failed to parse news response from AI");
  }
}

// Groq alternative (if user prefers Groq)
export async function sendNewsQueryGroq(
  userMessage: string,
  conversationHistory: ChatMessage[],
  apiKey: string
): Promise<NewsResponse> {
  const history = conversationHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.parsed
          ? `[Previous briefing on: ${m.parsed.headline}]`
          : m.content,
    }));

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(raw) as NewsResponse;
  } catch {
    throw new Error("Failed to parse Groq response");
  }
}
