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

/**
 * Fetches Wikipedia summary for accurate entity context.
 */
async function fetchWikiContext(title: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.query?.search?.length) return "";
    
    const pageTitle = searchData.query.search[0].title;
    
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    const extractRes = await fetch(extractUrl);
    const extractData = await extractRes.json();
    
    const pages = extractData.query?.pages;
    if (!pages) return "";
    const pageIds = Object.keys(pages);
    if (!pageIds.length || pageIds[0] === "-1") return "";
    
    const text = pages[pageIds[0]].extract || "";
    // Only return first ~1000 characters to keep it fast and within context
    return text.slice(0, 1000);
  } catch (err) {
    console.warn("Wiki fetch failed", err);
    return "";
  }
}

/** Helper: call OpenRouter with a prompt using the free auto-router */
async function callAI(prompt: string): Promise<string> {
  const url = import.meta.env.DEV ? "/api/openrouter/api/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";

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
  const prompt = `You are an award-winning news journalist. Based on the following real news article data, write a comprehensive, detailed, and well-structured news article in PURE HTML FORMAT ONLY.

**CRITICAL: NO MARKDOWN SYNTAX AT ALL!**
- NO ** or __ for bold
- NO # for headings
- NO * for lists
Output ONLY HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>

IMPORTANT RULES:
1. START with a powerful 1-2 sentence SUMMARY in a <p> tag that hooks readers immediately.

2. Then divide the article into CLEAR VISUAL SECTIONS. Every major section MUST use an <h2> tag with inline styling:
<h2 style="font-weight: bold; font-size: 24px; color: #000000; margin: 32px 0 20px 0; border-bottom: 2px solid #000000; padding-bottom: 12px;">Why This Matters</h2>

3. For subsections, use <h3> tags with inline styling:
<h3 style="font-weight: bold; font-size: 18px; color: #000000; margin: 24px 0 16px 0;">Sub-topic Name</h3>

4. Always write content using separate, elegant paragraphs wrapped in <p> tags. Leave whitespace between paragraphs.

5. Use <strong> for bold text within paragraphs, <em> for italic text.

6. Use <ul> and <li> tags for bullet lists, <ol> and <li> for numbered lists (NOT * or -)

7. End with Key Takeaways in this format:
<div style="background-color: #faf5ff; border-left: 4px solid #000000; padding: 24px; border-radius: 0 8px 8px 0; margin-top: 40px; margin-bottom: 16px;">
  <h3 style="font-weight: bold; color: #000000; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Key Takeaways</h3>
  <ul style="margin: 0; padding-left: 20px; list-style: disc;">
    <li style="margin-bottom: 12px;"><strong>Point 1:</strong> Description</li>
    <li style="margin-bottom: 12px;"><strong>Point 2:</strong> Description</li>
    <li style="margin-bottom: 0;"><strong>Point 3:</strong> Description</li>
  </ul>
</div>

8. Output ONLY HTML. NO markdown, NO ** or #, NO * for lists.
9. NO preamble or intro text. Start directly with <h2> or <p> tag.
10. Article must have clear visual hierarchy with colored headings and proper spacing.

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
 * HYPER-SPEED GENERATION ENGINE
 * Instead of relying purely on OpenRouter (which can take 15-30 seconds), this engine
 * fires the prompt to Groq (Llama 3.1 8B Instant) which completes in 1-2 seconds.
 * If Groq fails or rate limits, it falls back to the reliable OpenRouter free layer.
 * Wikipedia API is queried first for factual grounding.
 */
export async function fastGenerateArticle(article: GeminiArticleInput): Promise<string> {
  // Fetch Wikipedia context for accuracy
  let wikiContextStr = "";
  try {
    const searchTopic = article.title.split(" ").slice(0, 5).join(" ");
    const wikiText = await fetchWikiContext(searchTopic);
    if (wikiText) {
      wikiContextStr = `\n- Wikipedia True Context (MUST BE ACCURATE): ${wikiText}`;
    }
  } catch (e) {}

  const prompt = `You are an award-winning news journalist. Write a comprehensive news article in PURE HTML FORMAT ONLY. Make it engaging and compelling. Ensure all facts are highly accurate and grounded.

**CRITICAL: NO MARKDOWN! Output ONLY HTML tags.**
- NO ** or __ for bold
- NO # for headings
- NO * for lists
Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> instead.

IMPORTANT RULES:
1. START with a powerful 1-2 sentence SUMMARY in a <p> tag.

2. Divide into CLEAR VISUAL SECTIONS using <h2> tags with inline styling:
<h2 style="font-weight: bold; font-size: 24px; color: #000000; margin: 32px 0 20px 0; border-bottom: 2px solid #000000; padding-bottom: 12px;">Why This Matters</h2>

3. Use <h3> tags for sub-sections:
<h3 style="font-weight: bold; font-size: 18px; color: #000000; margin: 24px 0 16px 0;">Sub-topic Name</h3>

4. Always write separate paragraphs in <p> tags. DO NOT mash together.

5. Use <strong> for bold, <em> for italic.

6. Use <ul><li> for bullets, <ol><li> for numbered lists (NOT * or -)

7. End with Key Takeaways:
<div style="background-color: #faf5ff; border-left: 4px solid #000000; padding: 24px; border-radius: 0 8px 8px 0; margin-top: 40px; margin-bottom: 16px;">
  <h3 style="font-weight: bold; color: #000000; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Key Takeaways</h3>
  <ul style="margin: 0; padding-left: 20px; list-style: disc;">
    <li style="margin-bottom: 12px;"><strong>Point 1:</strong> Description</li>
    <li style="margin-bottom: 12px;"><strong>Point 2:</strong> Description</li>
    <li style="margin-bottom: 0;"><strong>Point 3:</strong> Description</li>
  </ul>
</div>

8. Output ONLY HTML. NO markdown symbols.
9. NO preamble. Start directly with content.

Source Data:
- Title: ${article.title}
- Source: ${article.sourceName}
- Published: ${article.publishedAt}${wikiContextStr}
- Description: ${article.description}
- Available Content Snippet: ${article.content}
`;

  try {
    if (!GROQ_API_KEY) throw new Error("No Groq API key found, bypassing straight to OpenRouter");
    
    console.log("[FastAI] Firing prompt to Groq (Llama 3.1 8B Instant) for hyper-speed generation...");
    // We use a separate fetch to Groq here to avoid circular imports and keep it contained
    const groqUrl = import.meta.env.DEV ? "/api/groq/openai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    const res = await fetch(groqUrl, {
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

  const prompt = `You are a professional news editor. Reformat the raw text below into a beautiful news article in PURE HTML FORMAT ONLY.

**CRITICAL: NO MARKDOWN! Output ONLY HTML tags.**
- NO ** or __ for bold
- NO # for headings
- NO * for lists
Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> instead.

IMPORTANT RULES:
1. START with a powerful 1-2 sentence SUMMARY in a <p> tag.

2. Divide into CLEAR VISUAL SECTIONS using <h2> tags with inline styling:
<h2 style="font-weight: bold; font-size: 24px; color: #000000; margin: 32px 0 20px 0; border-bottom: 2px solid #000000; padding-bottom: 12px;">Why This Matters</h2>

3. Use <h3> tags for sub-sections:
<h3 style="font-weight: bold; font-size: 18px; color: #000000; margin: 24px 0 16px 0;">Sub-topic Name</h3>

4. Always write separate paragraphs in <p> tags. DO NOT mash together.

5. Use <strong> for bold, <em> for italic.

6. Use <ul><li> for bullets, <ol><li> for numbered lists (NOT * or -)

7. End with Key Takeaways:
<div style="background-color: #faf5ff; border-left: 4px solid #000000; padding: 24px; border-radius: 0 8px 8px 0; margin-top: 40px; margin-bottom: 16px;">
  <h3 style="font-weight: bold; color: #000000; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Key Takeaways</h3>
  <ul style="margin: 0; padding-left: 20px; list-style: disc;">
    <li style="margin-bottom: 12px;"><strong>Point 1:</strong> Description</li>
    <li style="margin-bottom: 12px;"><strong>Point 2:</strong> Description</li>
    <li style="margin-bottom: 0;"><strong>Point 3:</strong> Description</li>
  </ul>
</div>

8. Remove any navigation, ads, cookies, boilerplate.
9. Keep all facts intact. Do NOT fabricate.
10. Output ONLY HTML. NO markdown.
11. NO preamble. Start directly with content.

End with Key Takeaways:
<div style="background-color: #faf5ff; border-left: 4px solid #000000; padding: 24px; border-radius: 0 8px 8px 0; margin-top: 40px; margin-bottom: 16px;">
  <h3 style="font-weight: bold; color: #000000; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Key Takeaways</h3>
  <ul style="margin: 0; padding-left: 20px; list-style: disc;">
    <li style="margin-bottom: 12px;"><strong>Point 1:</strong> Description</li>
    <li style="margin-bottom: 12px;"><strong>Point 2:</strong> Description</li>
    <li style="margin-bottom: 0;"><strong>Point 3:</strong> Description</li>
  </ul>
</div>
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
