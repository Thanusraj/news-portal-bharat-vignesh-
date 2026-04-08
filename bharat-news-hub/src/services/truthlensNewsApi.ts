import { EvidenceSource } from "@/types/analysis";

export async function searchNews(query: string, apiKey: string): Promise<EvidenceSource[]> {
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `/api/newsapi/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5&apiKey=${apiKey}`
    );
    const data = await res.json();
    if (data.status !== "ok") return [];

    return (data.articles || []).slice(0, 5).map((a: any) => ({
      title: a.title || "Untitled",
      url: a.url,
      snippet: a.description || a.content?.slice(0, 200) || "",
      stance: "neutral" as const,
      source: "news" as const,
    }));
  } catch (err) {
    console.error("NewsAPI error:", err);
    return [];
  }
}
