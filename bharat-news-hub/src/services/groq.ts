export async function groqChat(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  const res = await fetch("/api/groq/openai/v1/chat/completions", {
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

export async function groqChatJson(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<any> {
  const res = await fetch("/api/groq/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.1, // extremely low temperature for consistent JSON
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Groq JSON API error:", errText);
    throw new Error(`Groq API error: ${res.status}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    console.error("Groq returned invalid JSON despite format requirement:", content);
    return {};
  }
}

export async function extractTopic(text: string, apiKey: string): Promise<string> {
  if (text.length < 50 && !text.includes('http')) {
    return text.trim();
  }

  const result = await groqChat(
    [
      {
        role: "system",
        content:
          "Your ONLY task is to extract the core search topic from the user's input for a news query. Output ONLY the topic. No conversational filler.",
      },
      { role: "user", content: text },
    ],
    apiKey
  );
  
  let finalTopic = result.trim();
  finalTopic = finalTopic.replace(/^["'](.*)["']$/, '$1');
  return finalTopic || text.trim();
}

export async function buildNewsBriefGroq(
  topic: string,
  evidenceSummary: string,
  apiKey: string
) {
  const result = await groqChatJson(
    [
      {
        role: "system",
        content: `You are Bharat News AI, a professional news assistant.

Your job is to read the provided live news evidence and generate a highly structured, professional news briefing about the topic.

STRICT RULES:
1. "summary": Provide a clear, cohesive 2-3 paragraph professional overview of the current situation.
2. "takeaways": Extract 3 to 5 key factual bullet points from the news. Make them punchy and objective.
3. "sentiment": Analyze the overall tone of the news regarding this topic. Must be exactly "Positive", "Negative", "Neutral", or "Mixed".

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "summary": "Professional overview of the topic...",
  "takeaways": ["Point 1", "Point 2", "Point 3"],
  "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed"
}

IMPORTANT: Only output valid JSON containing the specified keys. Ensure the sentiment exactly matches one of the four allowed strings.`,
      },
      {
        role: "user",
        content: `Topic: "${topic}"\n\nLive News Evidence & Context:\n${evidenceSummary}`,
      },
    ],
    apiKey
  );

  return {
    summary: result.summary || "Unable to generate summary.",
    takeaways: result.takeaways || [],
    sentiment: ["Positive", "Negative", "Neutral", "Mixed"].includes(result.sentiment) ? result.sentiment : "Neutral",
  };
}

export async function followUpChat(
  topic: string,
  analysisContext: string,
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  return groqChat(
    [
      {
        role: "system",
        content: `You are Bharat News AI, a professional news assistant. You recently generated a news briefing about: "${topic}"

Background context of the briefing:
${analysisContext}

Rules for follow-up responses:
- You are a helpful, professional AI. Maintain a neutral and objective journalistic tone.
- Act as though you are providing real-time information based on the context. Do NOT state that you lack real-time access.
- Address the user's specific questions directly using the provided context.
- Keep responses relatively concise but informative. Use Markdown for readability where appropriate.`,
      },
      ...chatHistory,
      { role: "user", content: userMessage },
    ],
    apiKey
  );
}
