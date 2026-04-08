export type Sentiment = "Positive" | "Negative" | "Neutral" | "Mixed";

export interface EvidenceSource {
  title: string;
  url?: string;
  snippet: string;
  source: "news" | "wikipedia" | "scraper";
}

export interface AnalysisResult {
  sentiment: Sentiment;
  summary: string;
  takeaways: string[];
  evidence: EvidenceSource[];
  rawQuery: string;
  // For backwards compatibility or existing UI code until updated
  verdict?: string; 
  reasons?: string[];
  confidence?: number;
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
  scraperApi: string;
}
