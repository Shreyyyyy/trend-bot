"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, TrendingUp, ExternalLink, Calendar, Bell, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: number;
  name: string;
  url: string;
  why: string;
  build: string;
  market: string;
}

interface TrendItem {
  title: string;
  url: string;
  content: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [trendItems, setTrendItems] = useState<TrendItem[]>([]);
  const [timestamp, setTimestamp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "👋 Welcome! Click any trend signal on the left to get a deep-dive analysis, or ask me anything about this week's AI landscape." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ideasRes, trendsRes] = await Promise.all([
          fetch("/data/ideas.md"),
          fetch("/data/trends.json"),
        ]);

        // Parse ideas
        const ideasText = await ideasRes.text();
        const dateMatch = ideasText.match(/DATE: (.*)/);
        if (dateMatch) setTimestamp(dateMatch[1]);

        const lines = ideasText.split("\n").filter(l => l.trim() && /^\d+[\.\)]/.test(l.trim()));
        const parsed: Project[] = lines.map((line, index) => {
          const [main, ...rest] = line.split(" | ");
          const [prefix, urlPart] = main.split(" — ");
          const name = prefix.replace(/^\d+[\.\)]\s*/, "").trim();
          const url = urlPart ? urlPart.trim() : "";
          const meta: any = {};
          rest.forEach(r => {
            const [k, ...v] = r.split(": ");
            meta[k.trim()] = v.join(": ").trim();
          });
          return { id: index + 1, name, url, why: meta["WHY"] || "", build: meta["BUILD"] || "", market: meta["MARKET"] || "" };
        });
        setProjects(parsed);

        // Parse real trends — extract actual article results, not queries
        const trendsData = await trendsRes.json();
        const queries = trendsData?.trends?.queries || trendsData?.queries || [];
        const items: TrendItem[] = [];
        for (const q of queries) {
          for (const r of (q.results || [])) {
            if (r.title && r.url && r.content && items.length < 12) {
              // Filter out garbage/nav-heavy content
              const snippet = r.content.replace(/\[.*?\]\(.*?\)/g, "").replace(/!\[.*?\]\(.*?\)/g, "").trim();
              if (snippet.length > 40) {
                items.push({ title: r.title, url: r.url, content: snippet.slice(0, 100) + "…" });
              }
            }
          }
        }
        setTrendItems(items);
      } catch (e) {
        console.error("Failed to fetch data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customMsg?: string) => {
    const msg = customMsg || input.trim();
    if (!msg || isTyping) return;
    if (!customMsg) setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, projects, trendItems }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't connect. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatTimeline = (iso: string) => {
    if (!iso) return "This week";
    const end = new Date(iso);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  return (
    <div className="h-screen w-screen bg-[#07080c] text-white flex flex-col overflow-hidden font-sans">

      {/* Top Bar */}
      <header className="flex-none h-14 px-6 flex items-center justify-between border-b border-white/[0.06] bg-black/30 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">TrendBot</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full ml-1">AI</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{formatTimeline(timestamp)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] text-gray-500 font-medium">Live</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-grow flex overflow-hidden">

        {/* Left: Trend Signals */}
        <aside className="w-72 flex-none border-r border-white/[0.06] flex flex-col bg-black/10">
          <div className="flex-none px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Live Signals</span>
          </div>
          <div className="flex-grow overflow-y-auto px-3 py-3 space-y-2">
            {loading
              ? Array(8).fill(0).map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)
              : trendItems.map((item, i) => (
                <motion.button
                  key={i}
                  whileHover={{ x: 3 }}
                  onClick={() => handleSend(`Deep dive into this trend for me: "${item.title}". What's the problem it reveals, why is it trending now, and what can a developer build?`)}
                  className="w-full text-left px-3.5 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/[0.05] hover:border-blue-500/30 transition-all group"
                >
                  <p className="text-xs font-semibold text-white/80 line-clamp-2 leading-snug group-hover:text-white mb-1">{item.title}</p>
                  <p className="text-[10px] text-gray-600 line-clamp-1 group-hover:text-gray-400">{item.content}</p>
                </motion.button>
              ))}
          </div>
        </aside>

        {/* Center: Chat */}
        <main className="flex-grow flex flex-col overflow-hidden relative">
          {/* Chat messages */}
          <div className="flex-grow overflow-y-auto px-8 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2.5 flex-none mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white/[0.05] text-gray-100 border border-white/[0.07] rounded-tl-sm"
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"120ms"}} />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:"240ms"}} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-none px-8 pb-6 pt-3 border-t border-white/[0.06] bg-black/20 backdrop-blur-md">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask anything about a trend or project idea…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-5 pr-14 text-sm focus:outline-none focus:border-blue-500/40 transition-colors placeholder:text-gray-600"
              />
              <button
                onClick={() => handleSend()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        {/* Right: Build Queue */}
        <aside className="w-80 flex-none border-l border-white/[0.06] flex flex-col bg-black/10">
          <div className="flex-none px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Build Queue</span>
          </div>
          <div className="flex-grow overflow-y-auto px-3 py-3 space-y-2">
            {loading
              ? Array(5).fill(0).map((_, i) => <div key={i} className="h-28 bg-white/[0.03] rounded-xl animate-pulse" />)
              : projects.map((p, i) => (
                <div key={i} className="group px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/30 hover:bg-white/[0.04] transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[9px] font-mono text-gray-600 font-bold uppercase tracking-wider">#{String(p.id).padStart(2,"0")}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-white transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors leading-snug mb-1.5 line-clamp-2">{p.name}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{p.why}</p>
                  {p.build && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/[0.04]">
                      <p className="text-[10px] text-purple-400/70 font-bold uppercase tracking-wider mb-1">Build</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{p.build}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </aside>

      </div>
    </div>
  );
}
