import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const NEWSDATA_KEY = import.meta.env.VITE_NEWSDATA_API_KEY || "pub_14241bd286604aee885927456725ae79";
const NEWSDATA_BASE_URL = "/api/newsdata/api/1";

const GNEWS_API_KEYS = [
  import.meta.env.VITE_GNEWS_API_KEY_1 || "",
  import.meta.env.VITE_GNEWS_API_KEY_2 || "",
  import.meta.env.VITE_GNEWS_API_KEY_3 || "",
].filter(Boolean);
let currentKeyIndex = 0;

const NEWSAPI_KEY = import.meta.env.VITE_NEWSAPI_KEY || "";
const NEWSAPI_BASE_URL = "/api/newsapi/v2";

const THENEWSAPI_KEY = import.meta.env.VITE_THENEWSAPI_KEY || "DZ4qZGob3z1YzBSr1V9nY69XJS5PSmluvUJgXQNJ";
const THENEWSAPI_BASE_URL = "/api/thenewsapi/v1/news";

const WORLDNEWS_KEY = import.meta.env.VITE_WORLDNEWS_KEY || "02f6b4d0da1e45768bf3d2704c710c5e";
const WORLDNEWS_BASE_URL = "/api/worldnewsapi";

const BASE_URL = "/api/gnews/api/v4";

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  ai_content?: string; // Pre-generated AI content from n8n workflow
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: NewsArticle[];
}

export type NewsFetchMode = "default" | "fast";

export class NewsApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "NewsApiError";
    this.status = status;
  }
}

const RESPONSE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, { at: number; articles: NewsArticle[] }>();

function getBestCardsOnly(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter(a => 
    a.title && 
    a.title !== "[Removed]" &&
    a.description && 
    a.description.trim().length > 20 &&
    a.image && 
    a.image !== "null"
  );
}

function removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const validArticles = getBestCardsOnly(articles);
  return validArticles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

async function requestGNews(baseUrl: string): Promise<NewsArticle[]> {
  const cached = responseCache.get(baseUrl);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) {
    return cached.articles;
  }

  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < GNEWS_API_KEYS.length) {
    const activeKey = GNEWS_API_KEYS[currentKeyIndex];
    const finalUrl = `${baseUrl}&apikey=${activeKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(finalUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          currentKeyIndex = (currentKeyIndex + 1) % GNEWS_API_KEYS.length;
          attempts++;
          lastError = new NewsApiError("API limit reached for active key inside rotation.", res.status);
          continue; 
        }

        let details = "";
        try { details = await res.text(); } catch { details = ""; }
        throw new NewsApiError(`GNews error: ${res.status}${details ? ` - ${details}` : ""}`, res.status);
      }

      const data: GNewsResponse = await res.json();
      const articles = data.articles || [];
      responseCache.set(baseUrl, { at: Date.now(), articles });
      return articles;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new NewsApiError("Request timed out — check your internet connection", 0);
      }
      if (e instanceof NewsApiError && (e.status !== 403 && e.status !== 429)) {
        throw e;
      }
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        throw new NewsApiError("Failed to fetch news. Please check your internet connection.", 0);
      }
      lastError = e;
      break; 
    }
  }

  if (lastError instanceof NewsApiError) throw lastError;
  throw new NewsApiError("Unable to fetch news after trying all available GNews API keys. Setup dead.", 403);
}

async function requestNewsApi(baseUrl: string): Promise<NewsArticle[]> {
  const cached = responseCache.get(baseUrl);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) {
    return cached.articles;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const finalUrl = `${baseUrl}&apiKey=${NEWSAPI_KEY}`;
    const res = await fetch(finalUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`NewsAPI error ${res.status}`);
    }

    const data = await res.json();
    const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
      title: a.title || "",
      description: a.description || "",
      content: a.content || "",
      url: a.url || "",
      image: a.urlToImage || null,
      publishedAt: a.publishedAt || new Date().toISOString(),
      source: {
        name: a.source?.name || "Unknown",
        url: a.url || ""
      }
    }));
    
    // Discard deleted/removed articles which plague NewsApi
    const valid = articles.filter(a => a.url && a.title && a.title !== "[Removed]");
    
    responseCache.set(baseUrl, { at: Date.now(), articles: valid });
    return valid;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function requestNewsDataIo(baseUrl: string): Promise<NewsArticle[]> {
  const cached = responseCache.get(baseUrl);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) {
    return cached.articles;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const finalUrl = `${baseUrl}&apikey=${NEWSDATA_KEY}`;
    const res = await fetch(finalUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`NewsData.io error ${res.status}`);
    }

    const data = await res.json();
    const articles: NewsArticle[] = (data.results || []).map((a: any) => ({
      title: a.title || "",
      description: a.description || "",
      content: a.content || "",
      url: a.link || "",
      image: a.image_url || null,
      publishedAt: a.pubDate || new Date().toISOString(),
      source: {
        name: a.source_id || "Unknown",
        url: a.source_url || ""
      }
    }));
    
    responseCache.set(baseUrl, { at: Date.now(), articles });
    return articles;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function requestTheNewsApi(baseUrl: string): Promise<NewsArticle[]> {
  const cached = responseCache.get(baseUrl);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) return cached.articles;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const finalUrl = baseUrl.includes('?') ? `${baseUrl}&api_token=${THENEWSAPI_KEY}` : `${baseUrl}?api_token=${THENEWSAPI_KEY}`;
    const res = await fetch(finalUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`TheNewsApi error ${res.status}`);
    const data = await res.json();
    const articles: NewsArticle[] = (data.data || []).map((a: any) => ({
      title: a.title || "",
      description: a.description || a.snippet || "",
      content: a.description || a.snippet || "",
      url: a.url || "",
      image: a.image_url || null,
      publishedAt: a.published_at || new Date().toISOString(),
      source: { name: a.source || "Unknown", url: a.url || "" }
    }));
    responseCache.set(baseUrl, { at: Date.now(), articles });
    return articles;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function requestWorldNewsApi(baseUrl: string): Promise<NewsArticle[]> {
  const cached = responseCache.get(baseUrl);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) return cached.articles;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const finalUrl = baseUrl.includes('?') ? `${baseUrl}&api-key=${WORLDNEWS_KEY}` : `${baseUrl}?api-key=${WORLDNEWS_KEY}`;
    const res = await fetch(finalUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`WorldNewsApi error ${res.status}`);
    const data = await res.json();
    const articles: NewsArticle[] = (data.news || []).map((a: any) => ({
      title: a.title || "",
      description: a.text ? a.text.substring(0, 200) : "",
      content: a.text || "",
      url: a.url || "",
      image: a.image || null,
      publishedAt: a.publish_date || new Date().toISOString(),
      source: { name: a.author || "Unknown", url: a.url || "" }
    }));
    responseCache.set(baseUrl, { at: Date.now(), articles });
    return articles;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function fetchMultiSourced(
  gnewsUrl: string | null, 
  newsApiUrl: string | null,
  newsDataUrl: string | null,
  theNewsApiUrl: string | null = null,
  worldNewsUrl: string | null = null
): Promise<NewsArticle[]> {
  const promises = [];
  if (gnewsUrl) promises.push(requestGNews(gnewsUrl));
  if (newsApiUrl) promises.push(requestNewsApi(newsApiUrl));
  if (newsDataUrl) promises.push(requestNewsDataIo(newsDataUrl));
  if (theNewsApiUrl) promises.push(requestTheNewsApi(theNewsApiUrl));
  if (worldNewsUrl) promises.push(requestWorldNewsApi(worldNewsUrl));

  const results = await Promise.allSettled(promises);
  const articles: NewsArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  if (articles.length === 0) {
     const errorResult = results.find(r => r.status === "rejected");
     if (errorResult && errorResult.status === "rejected") {
        throw errorResult.reason;
     }
  }

  return removeDuplicates(articles);
}

/** 
 * Smart Database Fetch (TEMPORARILY DISABLED)
 * Bypassed at user request until n8n database is fully trained.
 * Relying 100% on Live APIs for now.
 */
async function fetchFromSupabaseFallback(max: number = 10, filterString?: string): Promise<NewsArticle[]> {
  return []; // Instantly return empty to force Live API usage
}

export async function fetchNewsByTopic(
  topic: string,
  lang = "en",
  country = "in",
  max = 10
): Promise<NewsArticle[]> {
  const topicLower = topic.toLowerCase();
  const standardCategories = ["business", "entertainment", "general", "health", "science", "sports", "technology", "world", "nation"];
  
  if (!standardCategories.includes(topicLower)) {
    return await searchNews(topic, max, lang, country);
  }

  const gnewsUrl = `${BASE_URL}/top-headlines?category=${topicLower}&lang=${lang}&country=${country}&max=${max}`;
  let newsApiUrl: string | null = null;
  let newsDataUrl: string | null = null;
  let theNewsApiUrl: string | null = null;
  let worldNewsUrl: string | null = null;
  
  if (lang === "en") {
    if (["business", "entertainment", "general", "health", "science", "sports", "technology"].includes(topicLower)) {
      newsApiUrl = `${NEWSAPI_BASE_URL}/top-headlines?category=${topicLower}&language=${lang}&country=${country}&pageSize=${max}`;
      theNewsApiUrl = `${THENEWSAPI_BASE_URL}/top?categories=${topicLower==='technology'?'tech':topicLower}&locale=${country}&language=${lang}&limit=${max}`;
    } else if (topicLower === "world") {
      newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=world&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
      theNewsApiUrl = `${THENEWSAPI_BASE_URL}/all?search=world&language=${lang}&limit=${max}`;
      worldNewsUrl = `${WORLDNEWS_BASE_URL}/search-news?text=world&language=${lang}&number=${max}`;
    } else if (topicLower === "nation") {
      const query = country === "in" ? "India" : "national news";
      newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=${encodeURIComponent(query)}&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
      theNewsApiUrl = `${THENEWSAPI_BASE_URL}/all?search=${encodeURIComponent(query)}&language=${lang}&limit=${max}`;
      worldNewsUrl = `${WORLDNEWS_BASE_URL}/search-news?source-country=${country}&language=${lang}&number=${max}`;
    }

    const validNewsDataCategories = ["business", "entertainment", "health", "science", "sports", "technology", "world"];
    if (validNewsDataCategories.includes(topicLower)) {
      newsDataUrl = `${NEWSDATA_BASE_URL}/news?category=${topicLower}&language=${lang}&country=${country}`;
    } else if (topicLower === "general" || topicLower === "nation") {
      newsDataUrl = `${NEWSDATA_BASE_URL}/news?language=${lang}&country=${country}`;
    }
    
    if (!worldNewsUrl && topicLower !== "world" && topicLower !== "nation") {
         worldNewsUrl = `${WORLDNEWS_BASE_URL}/search-news?source-country=${country}&language=${lang}&number=${max}`;
    }
  }

  // Compile the live API promise but don't await yet
  const liveApiPromise = fetchMultiSourced(gnewsUrl, newsApiUrl, newsDataUrl, theNewsApiUrl, worldNewsUrl);
  // Compile the Supabase promise
  const dbPromise = fetchFromSupabaseFallback(max, topicLower);

  try {
    const results = await Promise.allSettled([dbPromise, liveApiPromise]);
    
    const dbData = results[0].status === 'fulfilled' ? results[0].value : [];
    const liveData = results[1].status === 'fulfilled' ? results[1].value : [];

    const merged = removeDuplicates([...dbData, ...liveData]);
    if (merged.length > 0) {
      console.log(`[NewsApi] Hybrid load for '${topicLower}': ${dbData.length} DB + ${liveData.length} Live`);
      return merged.slice(0, max);
    }
  } catch (e) {
    console.warn(`[NewsApi] Hybrid fetch failed for topic '${topicLower}':`, e);
  }

  throw new NewsApiError("Unable to fetch news from APIs or database. Check your connection.", 500);
}

export async function fetchTopHeadlines(
  lang = "en",
  country = "in",
  max = 10,
  mode: NewsFetchMode = "default"
): Promise<NewsArticle[]> {
  // === HYBRID FETCH: Supabase disabled, running Live APIs only ===
  try {
    const dbPromise = fetchFromSupabaseFallback(max);

    const gnewsUrl = `${BASE_URL}/top-headlines?lang=${lang}&country=${country}&max=${max}`;
    const newsApiUrl = lang === "en" ? `${NEWSAPI_BASE_URL}/top-headlines?language=${lang}&country=${country}&pageSize=${max}` : null;
    const newsDataUrl = lang === "en" ? `${NEWSDATA_BASE_URL}/news?language=${lang}&country=${country}` : null;
    const theNewsApiUrl = lang === "en" ? `${THENEWSAPI_BASE_URL}/top?locale=${country}&language=${lang}&limit=${max}` : null;
    const worldNewsUrl = lang === "en" ? `${WORLDNEWS_BASE_URL}/search-news?source-country=${country}&language=${lang}&number=${max}` : null;
    
    const liveApiPromise = fetchMultiSourced(gnewsUrl, newsApiUrl, newsDataUrl, theNewsApiUrl, worldNewsUrl);
    
    const results = await Promise.allSettled([dbPromise, liveApiPromise]);
    const dbData = results[0].status === 'fulfilled' ? results[0].value : [];
    const liveData = results[1].status === 'fulfilled' ? results[1].value : [];
    
    const merged = removeDuplicates([...dbData, ...liveData]);
    if (merged.length > 0) return merged.slice(0, max);
    
    if (mode === "fast") return [];

    const fallbackTopic = await fetchNewsByTopic("general", lang, country, max);
    if (fallbackTopic.length > 0) return fallbackTopic;

    return await searchNews("India breaking news", max);
  } catch (e) {
    if (e instanceof NewsApiError) throw e;
    console.error("fetchTopHeadlines error:", e);
    if (mode === "fast") return [];
    try {
      const fallbackTopic = await fetchNewsByTopic("general", lang, country, max);
      if (fallbackTopic.length > 0) return fallbackTopic;
    } catch { /* ignore */ }
    return await searchNews("India breaking news", max);
  }
}

export async function fetchWorldNews(lang = "en", country = "in", max = 10, mode: NewsFetchMode = "default"): Promise<NewsArticle[]> {
  const gnewsUrl = `${BASE_URL}/top-headlines?category=world&lang=${lang}&country=us&max=${max}`;
  const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=world&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
  const newsDataUrl = `${NEWSDATA_BASE_URL}/news?category=world&language=${lang}`;
  const theNewsApiUrl = `${THENEWSAPI_BASE_URL}/all?search=world&language=${lang}&limit=${max}`;
  const worldNewsUrl = `${WORLDNEWS_BASE_URL}/search-news?text=world&language=${lang}&number=${max}`;
  
  try {
    const liveApiPromise = fetchMultiSourced(gnewsUrl, newsApiUrl, newsDataUrl, theNewsApiUrl, worldNewsUrl);
    const dbPromise = fetchFromSupabaseFallback(max, "world");
    
    const results = await Promise.allSettled([dbPromise, liveApiPromise]);
    const dbData = results[0].status === 'fulfilled' ? results[0].value : [];
    const liveData = results[1].status === 'fulfilled' ? results[1].value : [];
    
    const merged = removeDuplicates([...dbData, ...liveData]);
    if (merged.length > 0) return merged.slice(0, max);
    
    if (mode === "fast") return [];
    return await searchNews("world news", max, lang, country);
  } catch (e) {
    console.warn("[NewsApi] Fetch for world news failed:", e);
    return [];
  }
}

export async function fetchEventsNews(lang = "en", country = "in", max = 12): Promise<NewsArticle[]> {
  try {
    const query = country === "in" ? "India AND (upcoming OR event OR festival OR schedule OR launch)" : "(upcoming OR event OR festival OR schedule OR launch)";
    return await searchNews(query, max, lang, country);
  } catch (e) {
    console.error("fetchEventsNews error:", e);
    return [];
  }
}

export async function searchNews(
  query: string,
  max = 10,
  lang = "en",
  country = "in"
): Promise<NewsArticle[]> {
  const gnewsUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&lang=${lang}&country=${country}&max=${max}`;
  const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=${encodeURIComponent(query)}&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
  const newsDataUrl = `${NEWSDATA_BASE_URL}/news?q=${encodeURIComponent(query)}&language=${lang}&country=${country}`;
  const theNewsApiUrl = `${THENEWSAPI_BASE_URL}/all?search=${encodeURIComponent(query)}&language=${lang}&limit=${max}`;
  const worldNewsUrl = `${WORLDNEWS_BASE_URL}/search-news?text=${encodeURIComponent(query)}&source-country=${country}&language=${lang}&number=${max}`;
  
  try {
    const liveApiPromise = fetchMultiSourced(gnewsUrl, newsApiUrl, newsDataUrl, theNewsApiUrl, worldNewsUrl);
    const dbPromise = fetchFromSupabaseFallback(max, query);
    
    const results = await Promise.allSettled([dbPromise, liveApiPromise]);
    const dbData = results[0].status === 'fulfilled' ? results[0].value : [];
    const liveData = results[1].status === 'fulfilled' ? results[1].value : [];
    
    const merged = removeDuplicates([...dbData, ...liveData]);
    if (merged.length > 0) {
      console.log(`[NewsApi] Search query '${query}' yielded ${dbData.length} DB + ${liveData.length} Live`);
      return merged.slice(0, max);
    }
  } catch (e) {
    console.warn(`[NewsApi] Search failed for '${query}':`, e);
  }

  return [];
}

/** Clear the response cache so the next fetch hits the API */
export function clearNewsCache() {
  responseCache.clear();
}
