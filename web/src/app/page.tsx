"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, ExternalLink, RefreshCw, Sparkles, Zap, Target, Globe } from "lucide-react";
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
    <div className="h-screen w-screen bg-[#02040a] text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="flex-grow flex overflow-hidden relative z-10">
        {/* Main Feed Section */}
        <div className={`${chatOpen ? "w-[58%]" : "w-full"} h-full flex flex-col items-center justify-start pt-6 pb-6 px-10 transition-all duration-500 ease-in-out overflow-hidden`}>
          <div className="w-full max-w-4xl h-full flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className="flex-none flex items-end justify-between mb-6 border-b border-white/5 pb-4">
              <div className="space-y-0.5">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-blue-400 font-black tracking-[0.2em] text-[10px] uppercase">
                  <Sparkles className="w-3 h-3" />
                  Weekly Intelligence
                </motion.div>
                <motion.h1 initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-black tracking-tighter bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
                  Market Signals
                </motion.h1>
                {dateRange && <p className="text-[10px] text-gray-500 font-bold tracking-wide">{dateRange}</p>}
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="group relative flex items-center gap-2 text-[10px] font-black text-white/80 hover:text-white bg-white/5 hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/30 rounded-xl px-4 py-2 transition-all active:scale-95 disabled:opacity-50 overflow-hidden shadow-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-1000 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                {refreshing ? "Scanning..." : "Refresh"}
              </button>
            </div>

            {/* Fixed Height Cards Area - No Scroll */}
            <div className="flex-grow flex flex-col gap-3 overflow-hidden">
              {loading ? (
                <div className="flex-grow flex flex-col gap-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="text-sm font-black text-white/40 uppercase tracking-widest">No Signals Detected</h3>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div key={dateRange} className="flex-grow flex flex-col gap-3 h-full overflow-hidden">
                    {projects.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative flex-1 flex flex-col justify-center min-h-0"
                        onClick={() => handleSend(`Strategic analysis for "${p.name}". Why now?`)}
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                        <div className="relative h-full bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] group-hover:border-white/[0.1] px-6 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <span className="flex-none flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-black border border-blue-500/10">
                                {p.id}
                              </span>
                              <div className="min-w-0">
                                <h2 className="text-[15px] font-bold text-white/90 group-hover:text-white transition-colors truncate">{p.name}</h2>
                                {p.market && <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">{p.market}</span>}
                              </div>
                            </div>

                            <div className="flex gap-6 flex-1">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2 italic"><span className="text-blue-400/50 font-bold not-italic mr-1 uppercase text-[8px]">Why:</span>{p.why}</p>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-500 leading-snug line-clamp-2"><span className="text-purple-400/50 font-bold mr-1 uppercase text-[8px]">Build:</span>{p.build}</p>
                              </div>
                            </div>

                            {p.url && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex-none p-2 rounded-xl bg-white/5 text-gray-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all border border-white/5">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex-none w-[42%] border-l border-white/10 bg-[#0d1117]/50 backdrop-blur-2xl flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex-none h-16 px-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">AI Strategist</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="flex-grow overflow-y-auto px-6 py-6 space-y-4">
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                      m.role === "user" ? "bg-blue-600 text-white font-medium rounded-tr-sm" : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-sm"
                    }`}>{m.content}</div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="px-5 py-4 bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm flex gap-1.5 items-center">
                      {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex-none p-6 bg-white/[0.02] border-t border-white/5">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask about technical stack..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600 font-medium"
                  />
                  <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-90">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!chatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setChatOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-2xl shadow-blue-600/30 flex items-center justify-center transition-all hover:-translate-y-1 active:scale-90 z-50 group"
        >
          <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </motion.button>
      )}
    </div>
  );
}
