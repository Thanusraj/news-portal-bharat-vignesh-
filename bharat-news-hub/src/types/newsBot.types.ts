export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: NewsResponse | null;
  timestamp: string;
  type?: "news" | "error" | "plain";
}

export interface NewsResponse {
  headline: string;
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sources: string[];
  followUpSuggestions: string[];
  category?: string;
  breaking?: boolean;
  articleCount?: number;      // how many real articles were analyzed
  processingSteps?: string[]; // which pipeline steps ran
}

export interface ParsedQuery {
  intent: "news_fetch" | "explanation" | "summary" | "greeting" | "followup";
  topic: string;
  keywords: string[];
  entities: string[];
  category: string | null;
  requiresDeepContent: boolean;
  searchQuery: string;
}

export interface ApiConfig {
  groqApiKey?: string;
  anthropicApiKey?: string;
  newsApiKey?: string;
}
