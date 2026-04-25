import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { message, projects, trendItems } = await req.json();

    const systemPrompt = `You are TrendBot Assistant — a sharp, concise AI advisor for developers.
    
This week's project ideas:
${JSON.stringify(projects, null, 2)}

Real trend signals gathered from Reddit, GitHub, HN, and arXiv this week:
${JSON.stringify(trendItems, null, 2)}

Rules:
- When asked about a trend, explain: WHY it's trending, the pain it reveals, and the best project to build.
- Be concise (3-5 sentences max unless asked for detail).
- Speak like a senior engineer, not a marketer.`;

    const keys = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY,
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      throw new Error("No GROQ_API_KEY found");
    }

    let lastError = null;
    for (const key of keys) {
      try {
        const groq = new Groq({ apiKey: key });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.6,
          max_tokens: 800,
        });

        return NextResponse.json({ reply: completion.choices[0].message.content });
      } catch (error: any) {
        lastError = error;
        console.warn(`Groq API call failed with key starting ${key.substring(0, 10)}:`, error);
        continue;
      }
    }

    throw lastError || new Error("All Groq API keys failed");
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
