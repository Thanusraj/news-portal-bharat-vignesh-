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
}

export interface ApiConfig {
  groqApiKey?: string;
  anthropicApiKey?: string;
  newsApiKey?: string;
}
