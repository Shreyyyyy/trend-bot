import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const QUERIES = [
  "GitHub trending AI LLM projects this week",
  "Reddit MachineLearning hot posts this week problems",
  "Reddit LocalLLaMA trending discussion this week",
  "Hacker News Show HN AI tools this week",
  "arXiv new LLM agent paper this week",
  "open source RAG framework trending this week",
  "AI agent reliability tool failures this week",
  "local LLM optimization vLLM llama.cpp this week",
];

async function tavilySearch(query: string): Promise<{ title: string; url: string; content: string }[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 4,
      time_range: "week",
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    title: r.title || "",
    url: r.url || "",
    content: (r.content || "").slice(0, 300),
  }));
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(d: Date) {
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
}

export async function POST() {
  try {
    // 1. Fetch trends from Tavily in parallel
    const batchSize = 3;
    const allResults: { query: string; results: any[] }[] = [];
    for (let i = 0; i < QUERIES.length; i += batchSize) {
      const batch = QUERIES.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (q) => ({ query: q, results: await tavilySearch(q) })));
      allResults.push(...results);
    }

    // 2. Build trend context
    const trendsText = allResults
      .map(q => `QUERY: ${q.query}\n` + q.results.map(r => `  - ${r.title}: ${r.content}`).join("\n"))
      .join("\n\n");

    const urlPool = allResults.flatMap(q => q.results.map(r => r.url)).filter(Boolean).slice(0, 40);
    const urlPoolText = urlPool.length ? `\n\nURL POOL (pick one per idea):\n${urlPool.map(u => `- ${u}`).join("\n")}` : "";

    // 3. Generate ideas via Groq with Fallback
    const keys = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY,
    ].filter(Boolean) as string[];

    if (keys.length === 0) throw new Error("No GROQ_API_KEY found");

    let raw = "";
    let lastError = null;
    
    for (const key of keys) {
      try {
        const groq = new Groq({ apiKey: key });
        const completion = await groq.chat.completions.create({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.4,
          max_tokens: 600,
          messages: [
            {
              role: "system",
              content: `You are a startup analyst. Output EXACTLY 5 lines, numbered 1) to 5). Each line must follow this format exactly:
N) Project Name — URL | WHY: one sentence | BUILD: one sentence | MARKET: one word/phrase

Rules:
- One real URL from the URL POOL per idea
- No preamble, no explanation, no extra lines
- Each idea must address a real developer pain from the trends`,
            },
            {
              role: "user",
              content: `Here are this week's AI trends:\n\n${trendsText}${urlPoolText}\n\nOutput exactly 5 project ideas.`,
            },
          ],
        });
        raw = completion.choices[0].message.content || "";
        if (raw) break;
      } catch (error: any) {
        lastError = error;
        console.warn(`Refresh Groq API failed with key starting ${key.substring(0, 10)}:`, error);
        continue;
      }
    }

    if (!raw) throw lastError || new Error("All Groq API keys failed");

    // 4. Parse output
    const lines = raw
      .split("\n")
      .filter(l => /^\d+[\.\)]/.test(l.trim()))
      .slice(0, 5);

    while (lines.length < 5) {
      lines.push(`${lines.length + 1}) Trend Analysis — https://github.com/trending | WHY: More data needed | BUILD: Manual review | MARKET: General`);
    }

    const cleaned = lines.map(line => line.replace(/^(\d+[\.\)]\s*)(.+?)\s*—\s*—\s*/, "$1$2 — "));

    // 5. Build date range
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateRange = `${fmtDate(weekAgo)} to ${fmtDate(now)}`;

    return NextResponse.json({ dateRange, ideas: cleaned });
  } catch (err: any) {
    console.error("Refresh error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
