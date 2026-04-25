"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, TrendingUp, ExternalLink, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: number;
  name: string;
  url: string;
  why: string;
  build: string;
  market: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timestamp, setTimestamp] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const ideasRes = await fetch("/data/ideas.md");
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
      } catch (e) {
        console.error(e);
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

  const formatTimeline = (iso: string) => {
    if (!iso) return "This week";
    const end = new Date(iso);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  return (
    <div className="h-screen w-screen bg-[#07080c] text-white flex flex-col overflow-hidden font-sans">

      {/* Header */}
      <header className="flex-none h-14 px-8 flex items-center justify-between border-b border-white/[0.06] bg-black/20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight">TrendBot</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>{formatTimeline(timestamp)}</span>
        </div>
        <div className="w-[120px]" /> {/* spacer for centering */}
      </header>

      {/* Body */}
      <div className="flex-grow flex overflow-hidden">

        {/* Left: 5 Ideas */}
        <div className={`${chatOpen ? "w-[55%]" : "w-full"} flex-none flex flex-col transition-all duration-300 overflow-y-auto px-8 py-6`}>
          {loading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl mx-auto w-full">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-5">This week's execution-ready ideas</p>
              {projects.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="group flex items-start gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
                  onClick={() => handleSend(`Tell me more about idea #${p.id}: ${p.name}`)}
                >
                  <span className="flex-none mt-0.5 text-sm font-mono font-bold text-gray-600 w-5">{p.id}.</span>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white/90 group-hover:text-white text-[15px] leading-snug">{p.name}</p>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-none text-gray-600 hover:text-blue-400 transition-colors mt-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {(p.why || p.build || p.market) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                        {p.why && <p className="text-xs text-gray-500"><span className="text-gray-600 font-semibold">Why:</span> {p.why}</p>}
                        {p.market && <p className="text-xs text-gray-500"><span className="text-gray-600 font-semibold">Market:</span> {p.market}</p>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              <p className="text-center text-[11px] text-gray-700 pt-4">Click any idea to ask the AI for a deep dive.</p>
            </div>
          )}
        </div>

        {/* Right: Chat Panel (appears on demand) */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "45%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-none border-l border-white/[0.06] flex flex-col overflow-hidden bg-black/10"
            >
              {/* Chat header */}
              <div className="flex-none h-11 px-5 flex items-center justify-between border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white/70">AI Assistant</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-xs text-gray-600 hover:text-white transition-colors">✕ close</button>
              </div>

              {/* Messages */}
              <div className="flex-grow overflow-y-auto px-5 py-4 space-y-3">
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[90%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-white/[0.05] text-gray-200 border border-white/[0.07] rounded-tl-sm"
                      }`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-3 bg-white/[0.05] border border-white/[0.07] rounded-xl rounded-tl-sm flex gap-1 items-center">
                      {[0, 120, 240].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
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
                  <button
                    onClick={() => handleSend()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Floating chat button when panel is closed */}
      {!chatOpen && (
        <button
          onClick={() => { setChatOpen(true); }}
          className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all active:scale-95"
        >
          <Bot className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
