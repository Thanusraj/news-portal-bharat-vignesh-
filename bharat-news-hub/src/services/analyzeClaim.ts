import { AnalysisResult, ApiKeys, EvidenceSource } from "@/types/analysis";
import { searchWikipedia } from "./truthlensWikipedia";
import { searchNews } from "./truthlensNewsApi";
import { extractClaim, generateReasoning } from "./groq";
import { getFinalVerdict } from "./truthlensOpenRouter";

export async function analyzeClaim(
  input: string,
  apiKeys: ApiKeys,
  onProgress?: (step: string) => void
): Promise<AnalysisResult> {
  onProgress?.("Extracting claim...");
  const claim = await extractClaim(input, apiKeys.groq);

  onProgress?.("Gathering evidence...");
  const [wikiResults, newsResults] = await Promise.all([
    searchWikipedia(claim),
    searchNews(claim, apiKeys.newsApi),
  ]);

  const allEvidence: EvidenceSource[] = [...wikiResults, ...newsResults];

  const evidenceSummary = allEvidence
    .map((e, i) => `[${i + 1}] (${e.source}) ${e.title}: ${e.snippet}`)
    .join("\n");

  onProgress?.("Analyzing evidence...");
  const reasoning = await generateReasoning(claim, evidenceSummary, apiKeys.groq);

  onProgress?.("Generating final verdict...");
  const verdict = await getFinalVerdict(claim, reasoning, evidenceSummary, apiKeys.openRouter);

  // Classify evidence stances based on verdict
  const classifiedEvidence = allEvidence.map((e) => ({
    ...e,
    stance: classifyStance(e.snippet, verdict.verdict) as "supports" | "contradicts" | "neutral",
  }));

  return {
    verdict: verdict.verdict,
    confidence: verdict.confidence,
    reasons: verdict.reasons,
    evidence: classifiedEvidence,
    simplifiedExplanation: verdict.simplifiedExplanation,
    rawClaim: claim,
  };
}

function classifyStance(snippet: string, verdict: string): string {
  // Simple heuristic - in production you'd use NLP
  const lower = snippet.toLowerCase();
  const negativeWords = ["false", "debunked", "misleading", "incorrect", "hoax", "fake", "denied"];
  const positiveWords = ["confirmed", "verified", "true", "correct", "accurate", "proven"];
  
  const hasNeg = negativeWords.some((w) => lower.includes(w));
  const hasPos = positiveWords.some((w) => lower.includes(w));

  if (hasNeg && !hasPos) return "contradicts";
  if (hasPos && !hasNeg) return "supports";
  return "neutral";
}
