"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, ExternalLink } from "lucide-react";
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
        const parsed: Project[] = lines.slice(0, 5).map((line, index) => {
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

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const end = new Date(iso);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const fmt = (d: Date) =>
      `${ordinal(d.getDate())} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}`;
    return `${fmt(start)} to ${fmt(end)}`;
  };

  return (
    <div className="h-screen w-screen bg-[#07080c] text-white flex flex-col overflow-hidden font-sans">

      <div className={`flex-grow flex overflow-hidden transition-all duration-300`}>
        {/* Main ideas pane */}
        <div className={`${chatOpen ? "w-[55%]" : "w-full"} flex flex-col items-center justify-center px-8 transition-all duration-300`}>
          <div className="w-full max-w-xl">

            {/* Dynamic Date */}
            {!loading && timestamp && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-6">
                {formatDate(timestamp)}
              </p>
            )}

            {/* 5 Project Ideas */}
            {loading ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <ol className="space-y-3">
                {projects.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
                    onClick={() => handleSend(`Tell me more about: ${p.name}`)}
                  >
                    <span className="flex-none text-sm font-mono text-gray-600 w-4">{p.id}.</span>
                    <span className="flex-grow text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {p.name}
                    </span>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex-none text-gray-700 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </motion.li>
                ))}
              </ol>
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
              transition={{ duration: 0.25 }}
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

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-11 h-11 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all active:scale-95"
        >
          <Bot className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
