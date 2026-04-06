import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";

const SCRAPER_API_KEY = import.meta.env.VITE_SCRAPER_API_KEY || "";

export interface ScrapedArticle {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
}

export async function fetchFullArticle(url: string): Promise<ScrapedArticle> {
  const targetUrl = encodeURIComponent(url);
  // Add cors=true to ensure the browser doesn't block the ScraperAPI response
  const scraperUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${targetUrl}&render=false&cors=true`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000); // 4s timeout max for super fast fallback

  const response = await fetch(scraperUrl, { signal: controller.signal });
  clearTimeout(id);

  if (!response.ok) {
    throw new Error(`ScraperAPI error: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  
  // Use browser's native DOMParser to parse the raw HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Readability needs a document object
  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) {
    throw new Error("Readability failed to parse the article.");
  }

  // Sanitize the HTML output just in case
  const cleanHtml = DOMPurify.sanitize(article.content);

  return {
    title: article.title,
    content: cleanHtml,
    textContent: article.textContent,
    excerpt: article.excerpt,
  };
}
