export async function groqChat(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function extractClaim(text: string, apiKey: string): Promise<string> {
  // If it's a short, direct claim without URLs, just use it directly. 
  // This prevents small assist models from "auto-correcting" false claims.
  if (text.length < 150 && !text.includes('http')) {
    return text.trim();
  }

  const result = await groqChat(
    [
      {
        role: "system",
        content:
          "Your ONLY task is to extract the core claim from the user's input. Output ONLY the extracted claim. DO NOT correct, fact-check, or negate the claim, even if it is completely false. Preserve the original meaning exactly.",
      },
      { role: "user", content: text },
    ],
    apiKey
  );
  
  // Clean up any potential assistant prefixes
  let finalClaim = result.trim();
  if (finalClaim.toLowerCase().startsWith('the claim is:')) {
    finalClaim = finalClaim.substring(13).trim();
  }
  // Remove wrapping quotes if present
  finalClaim = finalClaim.replace(/^["'](.*)["']$/, '$1');
  
  return finalClaim || text.trim();
}

export async function generateReasoning(
  claim: string,
  evidence: string,
  apiKey: string
): Promise<string> {
  return groqChat(
    [
      {
        role: "system",
        content: `You are a fact-checking reasoning engine for TruthLens AI, an expert fake news detection system.

Given a claim and evidence, provide a structured analysis:

1. Evaluate whether the CLAIM itself is supported by the evidence — not whether the explanation makes sense.
2. If evidence is missing or weak, explicitly state that as a negative signal.
3. Identify contradictions between sources.
4. Prefer verified fact-check sources, scientific consensus, and trusted news outlets over opinions.
5. DO NOT assume missing data means the claim is true.

Output format:
• Brief analysis of evidence quality and relevance
• 3-5 bullet-point reasons supporting your assessment
• Note any contradictions or gaps in sources

Be concise, objective, and use simple language. No hallucinations.`,
      },
      {
        role: "user",
        content: `Claim: "${claim}"\n\nEvidence gathered:\n${evidence}`,
      },
    ],
    apiKey
  );
}

export async function followUpChat(
  claim: string,
  analysisContext: string,
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  return groqChat(
    [
      {
        role: "system",
        content: `You are TruthLens AI, an expert fake news detection assistant integrated into Bharat News Hub. You previously analyzed this claim: "${claim}"

Previous analysis context:
${analysisContext}

Rules for follow-up responses:
- Be precise and objective. No hallucinations.
- Base answers ONLY on provided analysis data + general knowledge.
- IMPORTANT: The analysis data provided to you is LIVE DATA freshly scraped from news sources and Wikipedia. Do NOT state that you lack real-time access.
- If asked to "explain simply" or "explain like I'm 10", use very simple language.
- If the user challenges the verdict, re-evaluate based on facts, not opinions.
- Keep responses concise — use bullet points where possible.
- Never fabricate sources or evidence.`,
      },
      ...chatHistory,
      { role: "user", content: userMessage },
    ],
    apiKey
  );
}
