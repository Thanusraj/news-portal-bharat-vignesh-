import { EvidenceSource } from "@/types/analysis";

export async function searchWikipedia(query: string): Promise<EvidenceSource[]> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    const res = await fetch(searchUrl);
    const data = await res.json();

    return (data.query?.search || []).map((item: any) => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      snippet: item.snippet.replace(/<[^>]*>/g, ""),
      stance: "neutral" as const,
      source: "wikipedia" as const,
    }));
  } catch (err) {
    console.error("Wikipedia API error:", err);
    return [];
  }
}
