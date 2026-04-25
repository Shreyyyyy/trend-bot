import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, projects } = await req.json();

    const systemPrompt = `You are the Trend Bot Assistant. You help users understand AI trends and project ideas.
    
    Current Project Ideas:
    ${JSON.stringify(projects, null, 2)}
    
    Answer the user's question based on these projects and general AI knowledge. 
    Be concise, technical, and helpful. If they ask for a deep dive or implementation details, give them high-level advice.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 500,
    });

    return NextResponse.json({ reply: completion.choices[0].message.content });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
