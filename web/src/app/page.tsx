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
        <div className={`${chatOpen ? "w-[58%]" : "w-full"} flex flex-col items-center justify-start py-12 px-8 transition-all duration-500 ease-in-out overflow-y-auto`}>
          <div className="w-full max-w-2xl">
            {/* Header Area */}
            <div className="flex items-end justify-between mb-10 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-blue-400 font-bold tracking-widest text-[10px] uppercase">
                  <Sparkles className="w-3 h-3" />
                  Weekly Intel
                </motion.div>
                <motion.h1 initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Market Signals
                </motion.h1>
                {dateRange && <p className="text-xs text-gray-500 font-medium">{dateRange}</p>}
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="group relative flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-5 py-2.5 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
              >
                <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-700 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                {refreshing ? "Scanning..." : "Update Feed"}
              </button>
            </div>

            {/* Content Area */}
            {loading ? (
              <div className="space-y-4 w-full">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-sm font-bold text-white/80">No trends detected</h3>
                <p className="text-xs text-gray-500 mt-1">Ready for your first weekly scan?</p>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={dateRange} className="space-y-5">
                  {projects.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group relative"
                      onClick={() => handleSend(`Deep dive on "${p.name}". What is the technical implementation?`)}
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500 blur-sm" />
                      <div className="relative bg-[#0d1117]/80 backdrop-blur-xl border border-white/10 group-hover:border-white/20 p-6 rounded-[1.8rem] transition-all duration-300 cursor-pointer">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-black border border-blue-500/20">
                              {p.id}
                            </span>
                            <h2 className="text-lg font-bold text-white/90 group-hover:text-white transition-colors">{p.name}</h2>
                          </div>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                              <Target className="w-3 h-3" />
                              The Why
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">{p.why}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                              <Zap className="w-3 h-3" />
                              The Build
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">{p.build}</p>
                          </div>
                        </div>

                        {p.market && (
                          <div className="mt-4 flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-tight">
                              <Globe className="w-2.5 h-2.5" />
                              {p.market}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
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
