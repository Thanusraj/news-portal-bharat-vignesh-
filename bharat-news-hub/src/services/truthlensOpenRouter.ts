import { Verdict } from "@/types/analysis";

interface VerdictResult {
  verdict: Verdict;
  confidence: number;
  reasons: string[];
  simplifiedExplanation: string;
}

export async function getFinalVerdict(
  claim: string,
  reasoning: string,
  evidenceSummary: string,
  apiKey: string
): Promise<VerdictResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are TruthLens AI, an expert fake news detection system.

Your job is to evaluate the ORIGINAL CLAIM, not the explanation.

STRICT RULES:
1. Always evaluate the truth of the CLAIM itself.
2. If there is NO strong scientific or factual evidence → Verdict = "False".
3. If the claim is misleading or partially correct → Verdict = "Partially True".
4. If multiple trusted sources clearly support the claim → Verdict = "True".
5. Ignore emotional language, opinions, or unsupported statements.
6. Prefer: Verified fact-check sources, Scientific consensus, Trusted news outlets.
7. DO NOT say "True" just because the explanation is correct.
8. DO NOT assume missing data means True.

DECISION LOGIC:
- "False" → No evidence OR contradicts known facts
- "True" → Strong evidence from multiple reliable sources
- "Partially True" → Mix of correct + misleading info

OUTPUT FORMAT (STRICT JSON only, nothing else):
{
  "verdict": "True" | "False" | "Partially True",
  "confidence": <number 0-100>,
  "reasons": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "simplifiedExplanation": "A simple explanation a 10-year-old could understand"
}

IMPORTANT:
- The evidence provided is LIVE DATA freshly scraped from news sources. You DO have real-time access through this evidence. Do not state otherwise.
- Be precise and objective
- No long paragraphs in reasons — keep them as short bullet points
- No hallucinations
- Base answer ONLY on provided data + general knowledge
- For 'reasons', provide actual factual statements. DO NOT use meta-statements like "Multiple sources say" or "Article [2] confirms". Write direct facts.
ONLY output valid JSON, nothing else.`,
        },
        {
          role: "user",
          content: `Claim: "${claim}"\n\nFact Check Results & Reasoning:\n${reasoning}\n\nNews Sources & Wikipedia Evidence:\n${evidenceSummary}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      verdict: parsed.verdict || "Unverified",
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      reasons: parsed.reasons || ["Unable to determine reasons"],
      simplifiedExplanation: parsed.simplifiedExplanation || "",
    };
  } catch {
    return {
      verdict: "Unverified",
      confidence: 50,
      reasons: ["Could not parse AI response"],
      simplifiedExplanation: "We couldn't fully verify this claim.",
    };
  }
}
