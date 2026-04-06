const GNEWS_API_KEYS = [
  import.meta.env.VITE_GNEWS_API_KEY_1 || "",
  import.meta.env.VITE_GNEWS_API_KEY_2 || "",
  import.meta.env.VITE_GNEWS_API_KEY_3 || "",
].filter(Boolean);
let currentKeyIndex = 0;

const NEWSAPI_KEY = import.meta.env.VITE_NEWSAPI_KEY || "";
const NEWSAPI_BASE_URL = "https://newsapi.org/v2";

const BASE_URL = "https://gnews.io/api/v4";

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
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

function removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
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

async function fetchDualSourced(gnewsUrl: string, newsApiUrl: string | null): Promise<NewsArticle[]> {
  const promises = [];
  promises.push(requestGNews(gnewsUrl));
  
  if (newsApiUrl) {
    promises.push(requestNewsApi(newsApiUrl));
  }

  const results = await Promise.allSettled(promises);
  const articles: NewsArticle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }

  if (articles.length === 0) {
     const gnewsResult = results[0];
     if (gnewsResult.status === "rejected") {
        throw gnewsResult.reason;
     }
  }

  return removeDuplicates(articles);
}

export async function fetchNewsByTopic(
  topic: string,
  lang = "en",
  country = "in",
  max = 10
): Promise<NewsArticle[]> {
  const gnewsUrl = `${BASE_URL}/top-headlines?category=${topic}&lang=${lang}&country=${country}&max=${max}`;
  let newsApiUrl: string | null = null;
  
  if (lang === "en") {
    if (["business", "entertainment", "general", "health", "science", "sports", "technology"].includes(topic)) {
      newsApiUrl = `${NEWSAPI_BASE_URL}/top-headlines?category=${topic}&language=${lang}&country=${country}&pageSize=${max}`;
    } else if (topic === "world") {
      newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=world&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
    } else if (topic === "nation") {
      const query = country === "in" ? "India" : "national news";
      newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=${encodeURIComponent(query)}&language=${lang}&sortBy=publishedAt&pageSize=${max}`;
    }
  }

  return await fetchDualSourced(gnewsUrl, newsApiUrl);
}

export async function fetchTopHeadlines(
  lang = "en",
  country = "in",
  max = 10,
  mode: NewsFetchMode = "default"
): Promise<NewsArticle[]> {
  try {
    const gnewsUrl = `${BASE_URL}/top-headlines?lang=${lang}&country=${country}&max=${max}`;
    const newsApiUrl = lang === "en" ? `${NEWSAPI_BASE_URL}/top-headlines?language=${lang}&country=${country}&pageSize=${max}` : null;
    
    const primary = await fetchDualSourced(gnewsUrl, newsApiUrl);
    if (primary.length > 0) return primary;
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

export async function fetchWorldNews(max = 10, mode: NewsFetchMode = "default"): Promise<NewsArticle[]> {
  try {
    const gnewsUrl = `${BASE_URL}/top-headlines?category=world&lang=en&country=us&max=${max}`;
    const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=world&language=en&sortBy=publishedAt&pageSize=${max}`;
    
    const primary = await fetchDualSourced(gnewsUrl, newsApiUrl);
    if (primary.length > 0) return primary;
    if (mode === "fast") return [];
    return await searchNews("world news", max);
  } catch (e) {
    if (e instanceof NewsApiError) throw e;
    console.error("fetchWorldNews error:", e);
    if (mode === "fast") return [];
    return await searchNews("world news", max);
  }
}

export async function fetchEventsNews(max = 12): Promise<NewsArticle[]> {
  try {
    const query = "India AND (upcoming OR event OR festival OR schedule OR launch)";
    return await searchNews(query, max);
  } catch (e) {
    console.error("fetchEventsNews error:", e);
    return [];
  }
}

export async function searchNews(
  query: string,
  max = 10
): Promise<NewsArticle[]> {
  const gnewsUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&lang=en&max=${max}`;
  const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${max}`;
  
  return await fetchDualSourced(gnewsUrl, newsApiUrl);
}

/** Clear the response cache so the next fetch hits the API */
export function clearNewsCache() {
  responseCache.clear();
}
