const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ""; // Added for hyper-speed generation

export interface GeminiArticleInput {
  title: string;
  description: string;
  content: string;
  sourceName: string;
  publishedAt: string;
  url: string;
}

/**
 * Uses OpenRouter's `openrouter/free` auto-router.
 * This special model ID automatically picks whatever free model is currently
 * available on their platform — it can never 404.
 * See: https://openrouter.ai/models/openrouter/free
 */
const FREE_MODEL = "openrouter/free";

/** Helper: call OpenRouter with a prompt using the free auto-router */
async function callAI(prompt: string): Promise<string> {
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    console.log(`[OpenRouter] Calling free auto-router...`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Bharat News",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[OpenRouter] API raw error:", errText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("OpenRouter returned an empty or invalid response.");
    }

    console.log(`[OpenRouter] Success!`);
    // Strip any markdown code block wrappers AI might add
    let cleaned = generatedText.trim();
    cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return cleaned;

  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("AI request timed out after 60 seconds.");
    }
    throw err;
  }
}

export async function generateFullArticle(article: GeminiArticleInput): Promise<string> {
  const prompt = `You are an expert news journalist. Based on the following real news article data, write a comprehensive, detailed, and well-structured news article. Expand on the topic with relevant context, background information, and analysis.

IMPORTANT RULES:
1. Write the full article body FIRST. You MUST divide the article into clear visual sections. EVERY section MUST have an <h2> heading tag. Do not use plain text or bold text for headings. Example: <h2>Section Heading</h2>
2. Always write content using separate, elegant paragraphs wrapped in <p> tags. Leave blank lines between paragraphs in your output for readibility. Do not use <br> for spacing.
3. End the article with a Key Takeaways section at the very bottom. You MUST wrap this section in exactly this markup (do not alter the classes):
<div class="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl mt-10 mb-4">
  <h3 class="text-xl font-bold text-primary mb-4 mt-0">Key Takeaways</h3>
  <ul class="space-y-3 mb-0">
    <li>[Point 1]</li>
    <li>[Point 2]</li>
  </ul>
</div>
3. Include relevant background context and explain why this news matters.
4. Output ONLY clean semantic HTML (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags).
5. DO NOT wrap output in markdown code blocks or backticks.
6. DO NOT add any preamble like "Here is the article". Start directly with the HTML content.
7. The article should be beautifully formatted for a premium reading experience.

Source Data:
- Title: ${article.title}
- Source: ${article.sourceName}
- Published: ${article.publishedAt}
- Description: ${article.description}
- Available Content Snippet: ${article.content}
- Original URL: ${article.url}
`;

  return callAI(prompt);
}

/**
 * HYBER-SPEED GENERATION ENGINE ⚡
 * Instead of relying purely on OpenRouter (which can take 15-30 seconds), this engine
 * fires the prompt to Groq (Llama 3.1 8B Instant) which completes in 1-2 seconds.
 * If Groq fails or rate limits, it falls back to the reliable OpenRouter free layer.
 */
export async function fastGenerateArticle(article: GeminiArticleInput): Promise<string> {
  const prompt = `You are an expert news journalist. Based on the following real news article data, write a comprehensive, detailed, and well-structured news article. Expand on the topic with relevant context, background information, and analysis.

IMPORTANT RULES:
1. Write the full article body FIRST. You MUST divide the article into clear visual sections. EVERY section MUST have an <h2> heading tag.
2. Always write content using separate, elegant paragraphs wrapped in <p> tags. DO NOT mash paragraphs together.
3. End the article with a Key Takeaways section at the very bottom. You MUST wrap this section in exactly this markup (do not alter the classes):
<div class="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl mt-10 mb-4">
  <h3 class="text-xl font-bold text-primary mb-4 mt-0">Key Takeaways</h3>
  <ul class="space-y-3 mb-0">
    <li>[Point 1]</li>
    <li>[Point 2]</li>
  </ul>
</div>
4. Include relevant background context and explain why this news matters.
5. Output ONLY clean semantic HTML (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>).
6. DO NOT wrap output in markdown code blocks or backticks.
7. DO NOT add any preamble like "Here is the article" or "I am an AI". Start directly with the HTML content.

Source Data:
- Title: ${article.title}
- Source: ${article.sourceName}
- Published: ${article.publishedAt}
- Description: ${article.description}
- Available Content Snippet: ${article.content}
`;

  try {
    if (!GROQ_API_KEY) throw new Error("No Groq API key found, bypassing straight to OpenRouter");
    
    console.log("[FastAI] Firing prompt to Groq (Llama 3.1 8B Instant) for hyper-speed generation...");
    // We use a separate fetch to Groq here to avoid circular imports and keep it contained
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      // Short timeout because Groq is almost instantaneous. If it takes >5s, it's stuck.
      signal: AbortSignal.timeout(8000), 
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) throw new Error(`Groq returned ${res.status}`);
    
    const data = await res.json();
    const generatedText = data?.choices?.[0]?.message?.content;
    
    if (generatedText) {
      console.log("[FastAI] Success! Groq generated the article in hyper-speed.");
      let cleaned = generatedText.trim();
      cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
      return cleaned;
    }
  } catch (err: any) {
    console.warn("[FastAI] Groq generation failed/timed out, falling back to OpenRouter free router:", err.message);
  }

  // FALLBACK: Safe and steady OpenRouter Auto-Route
  console.log("[FastAI] Using OpenRouter steady fallback...");
  return callAI(prompt);
}

/**
 * Takes raw scraped article text and returns clean, structured HTML.
 * This is the function used by NewsDetail after ScraperAPI extraction.
 */
export async function optimizeArticleText(rawText: string): Promise<string> {
  // If the text is too short, it's not worth sending to AI
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Extracted text is too short to optimize.");
  }

  // Truncate to ~8000 chars to avoid token limits
  const truncated = rawText.slice(0, 8000);

  const prompt = `You are a professional news editor. Below is the raw extracted text from a news article. Reformat it into a clean, beautiful, and well-structured news article.

IMPORTANT RULES:
1. Write the full article body FIRST. You MUST divide the article into clear visual sections. EVERY section MUST have an <h2> heading tag. Do not use plain text or bold text for headings. Example: <h2>Section Heading</h2>
2. Always write content using separate, elegant paragraphs wrapped in <p> tags. DO NOT mash paragraphs together. Do not use <br> for spacing.
3. End the article with a Key Takeaways section at the very bottom. You MUST wrap this section in exactly this markup (do not alter the classes):
<div class="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl mt-10 mb-4">
  <h3 class="text-xl font-bold text-primary mb-4 mt-0">Key Takeaways</h3>
  <ul class="space-y-3 mb-0">
    <li>[Point 1]</li>
    <li>[Point 2]</li>
  </ul>
</div>
3. Remove any navigation text, ads, cookie notices, or irrelevant boilerplate.
4. Keep all factual content intact — do NOT fabricate information.
5. Output ONLY clean semantic HTML (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags).
6. DO NOT wrap output in markdown code blocks or backticks.
7. DO NOT add any preamble. Start directly with the HTML content.
8. The article should be beautifully formatted for a professional premium reading experience.

Raw Text:
${truncated}
`;

  return callAI(prompt);
}

/**
 * Fallback: generate an article from basic metadata when scraping fails.
 * Uses the title, description, and content snippet from the news API.
 */
export async function generateFromMetadata(article: GeminiArticleInput): Promise<string> {
  return generateFullArticle(article);
}
