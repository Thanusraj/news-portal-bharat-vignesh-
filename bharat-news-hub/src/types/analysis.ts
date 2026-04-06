export type Verdict = "True" | "False" | "Partially True" | "Unverified";

export interface EvidenceSource {
  title: string;
  url?: string;
  snippet: string;
  stance: "supports" | "contradicts" | "neutral";
  source: "news" | "factcheck" | "wikipedia";
}

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;
  reasons: string[];
  evidence: EvidenceSource[];
  simplifiedExplanation?: string;
  rawClaim: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  analysis?: AnalysisResult;
}

export interface ApiKeys {
  openRouter: string;
  groq: string;
  huggingFace: string;
  newsApi: string;
}
