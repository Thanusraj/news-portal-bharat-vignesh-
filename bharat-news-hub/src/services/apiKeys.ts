import { ApiKeys } from "@/types/analysis";

export function getApiKeys(): ApiKeys {
  return {
    openRouter: import.meta.env.VITE_OPENROUTER_TRUTHLENS_KEY || "",
    groq: import.meta.env.VITE_GROQ_API_KEY || "",
    huggingFace: import.meta.env.VITE_HUGGINGFACE_TOKEN || "",
    newsApi: import.meta.env.VITE_NEWSAPI_TRUTHLENS_KEY || "",
  };
}

export function saveApiKeys(keys: ApiKeys): void {
  // Keys are now managed via .env — this is a no-op
}

export function hasRequiredKeys(): boolean {
  const keys = getApiKeys();
  return !!(keys.openRouter && keys.groq);
}
