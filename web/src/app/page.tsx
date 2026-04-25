"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, ExternalLink, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: number;
  raw: string;
  name: string;
  url: string;
  why: string;
  build: string;
  market: string;
}

function parseLine(line: string, index: number): Project {
  const [main, ...rest] = line.split(" | ");
  const dashIdx = main.indexOf(" — ");
  const name = dashIdx > -1
    ? main.slice(0, dashIdx).replace(/^\d+[\.\)]\s*/, "").trim()
    : main.replace(/^\d+[\.\)]\s*/, "").trim();
  const url = dashIdx > -1 ? main.slice(dashIdx + 3).trim() : "";
  const meta: any = {};
  rest.forEach(r => {
    const colonIdx = r.indexOf(": ");
    if (colonIdx > -1) meta[r.slice(0, colonIdx).trim()] = r.slice(colonIdx + 2).trim();
  });
  return { id: index + 1, raw: line, name, url, why: meta["WHY"] || "", build: meta["BUILD"] || "", market: meta["MARKET"] || "" };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dateRange, setDateRange] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      // 1. Try loading from localStorage first (for instant feedback)
      const cachedDate = localStorage.getItem("trendbot_date");
      const cachedProjects = localStorage.getItem("trendbot_projects");
      if (cachedDate && cachedProjects) {
        setDateRange(cachedDate);
        setProjects(JSON.parse(cachedProjects));
        setLoading(false);
      }

      try {
        const ideasRes = await fetch("/data/ideas.md");
        const ideasText = await ideasRes.text();
        const dateMatch = ideasText.match(/^DATE:\s*(.+)/m);
        const rawDate = dateMatch ? dateMatch[1].trim() : "";
        
        const lines = ideasText.split("\n").filter(l => l.trim() && /^\d+[\.\)]/.test(l.trim())).slice(0, 5);
        
        // Only override cache if ideas.md actually has data
        if (rawDate && rawDate !== "No data yet" && lines.length > 0) {
          const parsed = lines.map(parseLine);
          setDateRange(rawDate);
          setProjects(parsed);
          localStorage.setItem("trendbot_date", rawDate);
          localStorage.setItem("trendbot_projects", JSON.stringify(parsed));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const parsed = data.ideas.map(parseLine);
      setDateRange(data.dateRange);
      setProjects(parsed);
      
      // Store in localStorage
      localStorage.setItem("trendbot_date", data.dateRange);
      localStorage.setItem("trendbot_projects", JSON.stringify(parsed));
    } catch (e: any) {
      alert("Refresh failed: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSend = async (customMsg?: string) => {
    const msg = customMsg || input.trim();
    if (!msg || isTyping) return;
    if (!customMsg) setInput("");
    if (!chatOpen) setChatOpen(true);
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, projects }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't connect. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#07080c] text-white flex flex-col overflow-hidden font-sans">
      <div className="flex-grow flex overflow-hidden">

        {/* Main pane */}
        <div className={`${chatOpen ? "w-[55%]" : "w-full"} flex flex-col items-center justify-center px-8 transition-all duration-300`}>
          <div className="w-full max-w-lg">

            {/* Date + Refresh */}
            <div className="flex items-center justify-between mb-7">
              {dateRange ? (
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{dateRange}</p>
              ) : (
                <div className="h-3 w-48 bg-white/[0.03] rounded animate-pulse" />
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white border border-white/[0.06] hover:border-white/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Fetching…" : "Refresh now"}
              </button>
            </div>

            {/* Spinner overlay while refreshing */}
            {refreshing && (
              <div className="text-xs text-gray-600 text-center mb-4 animate-pulse">
                Scanning Reddit, GitHub, HN & arXiv — takes ~30s…
              </div>
            )}

            {/* Ideas list */}
            {loading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <p className="text-gray-600 text-sm">No trends fetched yet.</p>
                <p className="text-gray-700 text-xs">Hit <span className="text-white/40 font-semibold">Refresh now</span> to scan this week's AI landscape.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.ol key={dateRange} className="space-y-2.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {projects.map((p, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="group px-4 py-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
                      onClick={() => handleSend(`Tell me more about: ${p.name}`)}
                    >
                      {/* Row 1: Number + Name */}
                      <div className="flex items-start gap-3">
                        <span className="flex-none text-xs font-mono text-gray-600 mt-0.5 w-4">{p.id}.</span>
                        <span className="flex-grow text-sm font-semibold text-white/85 group-hover:text-white transition-colors leading-snug">{p.name}</span>
                      </div>

                      {/* Row 2: WHY + PROBLEM */}
                      {(p.why || p.build) && (
                        <div className="mt-2 ml-7 space-y-1">
                          {p.why && (
                            <p className="text-xs text-gray-500 leading-relaxed">
                              <span className="text-gray-600 font-semibold">Why: </span>{p.why}
                            </p>
                          )}
                          {p.build && (
                            <p className="text-xs text-gray-500 leading-relaxed">
                              <span className="text-gray-600 font-semibold">Build: </span>{p.build}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Row 3: Source link */}
                      {p.url && (
                        <div className="mt-2 ml-7">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500/60 hover:text-blue-400 transition-colors truncate max-w-full"
                          >
                            <ExternalLink className="w-3 h-3 flex-none" />
                            <span className="truncate">{p.url.replace(/^https?:\/\//, "")}</span>
                          </a>
                        </div>
                      )}
                    </motion.li>
                  ))}
                </motion.ol>
              </AnimatePresence>
            )}

            {!loading && (
              <p className="text-[11px] text-gray-700 mt-6 text-center">Click any idea to ask the AI for deeper analysis.</p>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "45%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-none border-l border-white/[0.06] flex flex-col overflow-hidden bg-black/10"
            >
              <div className="flex-none h-11 px-5 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white/60">AI Assistant</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-xs text-gray-700 hover:text-white transition-colors">✕</button>
              </div>

              <div className="flex-grow overflow-y-auto px-5 py-4 space-y-3">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white/[0.05] text-gray-200 border border-white/[0.07] rounded-tl-sm"
                      }`}>{m.content}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-3 bg-white/[0.05] border border-white/[0.07] rounded-xl rounded-tl-sm flex gap-1 items-center">
                      {[0, 120, 240].map(d => <span key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex-none px-4 pb-4 pt-2 border-t border-white/[0.06]">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask more…"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-4 pr-11 text-sm focus:outline-none focus:border-blue-500/40 transition-colors placeholder:text-gray-700"
                  />
                  <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-all active:scale-95">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 w-11 h-11 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all active:scale-95">
          <Bot className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
