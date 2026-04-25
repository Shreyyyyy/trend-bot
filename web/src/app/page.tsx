"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, TrendingUp, Cpu, Globe, Rocket, MessageSquare, ChevronRight, ExternalLink, Calendar, Bell, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: number;
  name: string;
  url: string;
  why: string;
  build: string;
  market: string;
}

interface RawTrend {
  query: string;
  results: { title: string; url: string; content: string }[];
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rawTrends, setRawTrends] = useState<RawTrend[]>([]);
  const [timestamp, setTimestamp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm the Trend Bot assistant. Ask me anything about this week's AI trends, or click a trend on the left to learn more!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Ideas
        const ideasRes = await fetch("/data/ideas.md");
        const ideasText = await ideasRes.text();
        
        const dateMatch = ideasText.match(/DATE: (.*)/);
        if (dateMatch) setTimestamp(dateMatch[1]);

        const lines = ideasText.split("\n").filter(l => l.trim() && l.includes(")"));
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

        // Fetch Raw Trends
        const trendsRes = await fetch("/data/trends.json");
        const trendsData = await trendsRes.json();
        setRawTrends(trendsData.trends.queries || []);
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
        body: JSON.stringify({ message: msg, projects, rawTrends }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "...";
    const date = new Date(iso);
    const prevWeek = new Date(date);
    prevWeek.setDate(prevWeek.getDate() - 7);
    return `${prevWeek.toLocaleDateString()} — ${date.toLocaleDateString()}`;
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-blue-500/30 font-sans overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Header / Timeline */}
      <header className="relative z-20 border-b border-white/5 bg-black/20 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">TrendBot</span>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-400">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Timeline: {formatDate(timestamp)}</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors"><Info className="w-5 h-5" /></button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
        </div>
      </header>

      {/* Layout Grid */}
      <div className="flex-grow flex relative z-10 overflow-hidden">
        
        {/* Left Sidebar: Trends Notifications */}
        <aside className="w-80 border-r border-white/5 flex flex-col hidden lg:flex bg-black/10">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" /> Latest Signals
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              Array(6).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
            ) : (
              rawTrends.map((trend, i) => (
                <motion.button
                  key={i}
                  whileHover={{ x: 4 }}
                  onClick={() => handleSend(`Tell me more about this trend: "${trend.query}"`)}
                  className="w-full text-left p-4 bg-white/[0.03] hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                >
                  <p className="text-xs font-mono text-blue-400 mb-1">Signal {i+1}</p>
                  <p className="text-sm font-medium text-gray-200 line-clamp-2 leading-snug group-hover:text-white">{trend.query}</p>
                </motion.button>
              ))
            )}
          </div>
        </aside>

        {/* Center: The Brain (Chatbot) */}
        <main className="flex-grow flex flex-col bg-black/5 relative">
          <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6 pt-10">
              <AnimatePresence>
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] p-5 rounded-3xl text-[15px] leading-relaxed shadow-lg ${
                      m.role === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-none backdrop-blur-xl"
                    }`}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/10 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
            <div className="max-w-3xl mx-auto relative group">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about a trend or implementation..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-lg focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600 shadow-inner"
              />
              <button 
                onClick={() => handleSend()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-4 uppercase tracking-[0.2em] font-bold">TrendBot Intelligence Node v2.0</p>
          </div>
        </main>

        {/* Right Sidebar: Execution (Ideas) */}
        <aside className="w-[450px] border-l border-white/5 flex flex-col bg-black/10 hidden xl:flex">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-purple-500" /> Build Queue
            </h2>
          </div>
          <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading ? (
              Array(5).fill(0).map((_, i) => <div key={i} className="h-40 bg-white/5 rounded-3xl animate-pulse" />)
            ) : (
              projects.map((p, i) => (
                <div key={i} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] font-mono text-gray-600">IDEA #0{p.id}</span>
                    <a href={p.url} target="_blank" className="p-2 bg-white/5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">{p.name}</h3>
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed line-clamp-3">{p.why}</p>
                  <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10 space-y-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-purple-500 tracking-wider">The Build</span>
                      <p className="text-xs text-gray-300 mt-1">{p.build}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </aside>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
