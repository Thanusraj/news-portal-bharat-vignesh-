import { AnalysisResult, ApiKeys, EvidenceSource } from "@/types/analysis";
import { searchWikipedia } from "./truthlensWikipedia";
import { searchNews } from "./truthlensNewsApi";
import { extractTopic, buildNewsBriefGroq } from "./groq";
import { fetchFullArticle } from "./scraperApi";

export async function analyzeClaim(
  input: string,
  apiKeys: ApiKeys,
  onProgress?: (step: string) => void
): Promise<AnalysisResult> {
  onProgress?.("Extracting topic...");
  const topic = await extractTopic(input, apiKeys.groq);

  onProgress?.("Gathering breaking news...");
  const [wikiResults, newsResults] = await Promise.all([
    searchWikipedia(topic),
    searchNews(topic, apiKeys.newsApi),
  ]);

  const allEvidence: EvidenceSource[] = [...wikiResults, ...newsResults];
  
  let deepContext = "";
  // Use ScraperAPI to fetch full text of the top news article if available
  if (newsResults.length > 0 && newsResults[0].url) {
    onProgress?.("Deep reading top article...");
    try {
      const fullArticle = await fetchFullArticle(newsResults[0].url);
      deepContext = `\n\nDeep Context from top article (${newsResults[0].title}):\n${fullArticle.excerpt}\n...\n${fullArticle.textContent.slice(0, 2000)}`;
      allEvidence.push({
        title: `Deep Read: ${newsResults[0].title}`,
        url: newsResults[0].url,
        snippet: fullArticle.excerpt,
        source: "scraper",
      });
    } catch (e) {
      console.warn("ScraperAPI failed to deep read:", e);
    }
  }

  const evidenceSummary = allEvidence
    .filter(e => e.source !== 'scraper') // Avoid duplicating the top article snippet since we pass deepContext
    .map((e, i) => `[${i + 1}] (${e.source}) ${e.title}: ${e.snippet}`)
    .join("\n");

  onProgress?.("Analyzing and summarizing...");
  const brief = await buildNewsBriefGroq(topic, evidenceSummary + deepContext, apiKeys.groq);

  return {
    sentiment: brief.sentiment || "Neutral",
    summary: brief.summary || "No summary could be generated.",
    takeaways: brief.takeaways || [],
    evidence: allEvidence,
    rawQuery: topic,
  };
}
