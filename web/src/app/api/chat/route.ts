import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, projects, rawTrends } = await req.json();

    const systemPrompt = `You are the Trend Bot Assistant. 
    
    Current Project Ideas:
    ${JSON.stringify(projects, null, 2)}
    
    Underlying Trends/Signals Gathered:
    ${JSON.stringify(rawTrends, null, 2)}
    
    Answer the user's question. If they click on a trend signal, provide a deep dive into WHY it's trending and WHAT problems it causes.
    Be concise, technical, and high-energy. Focus on developer opportunities.`;

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
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
