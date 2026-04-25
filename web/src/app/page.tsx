"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, TrendingUp, Cpu, Globe, Rocket, MessageSquare, ChevronRight, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm the Trend Bot assistant. Ask me anything about this week's AI trends and project ideas!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/data/ideas.md");
        if (!res.ok) throw new Error("Failed to fetch");
        const text = await res.text();
        
        const lines = text.split("\n").filter(l => l.trim() && l.includes(")"));
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

          return {
            id: index + 1,
            name: name,
            url: url,
            why: meta["WHY"] || "",
            build: meta["BUILD"] || "",
            market: meta["MARKET"] || ""
          };
        });
        setProjects(parsed);
      } catch (e) {
        console.error("Failed to fetch ideas", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, projects }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting to the brain. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">TrendBot <span className="text-purple-500 text-sm align-top ml-1">AI</span></h1>
            <p className="text-gray-400 text-sm">Weekly Market Intelligence</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400"
        >
          <a href="#" className="hover:text-white transition-colors">Trends</a>
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
          <a href="#" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all">
            Live Updates
          </a>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-20 pt-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent leading-tight"
          >
            5 Execution-Ready <br /> Project Ideas
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Freshly baked from this week's AI research, Reddit deep-dives, and GitHub bottlenecks. 
            Stop scrolling, start building.
          </motion.p>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-80 bg-white/5 rounded-3xl animate-pulse" />
            ))
          ) : (
            projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="h-full p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/50 transition-all duration-500 backdrop-blur-xl flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      {p.id === 1 && <Cpu className="w-5 h-5" />}
                      {p.id === 2 && <Globe className="w-5 h-5" />}
                      {p.id === 3 && <Rocket className="w-5 h-5" />}
                      {p.id === 4 && <MessageSquare className="w-5 h-5" />}
                      {p.id === 5 && <Bot className="w-5 h-5" />}
                    </div>
                    <span className="text-xs font-mono text-gray-500">#0{p.id}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">{p.name}</h3>
                  <p className="text-gray-400 text-sm mb-6 flex-grow line-clamp-3">{p.why}</p>
                  
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Build Recommendation</span>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2">{p.build}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Market Potential</span>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2">{p.market}</p>
                    </div>
                  </div>

                  <a 
                    href={p.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white text-white hover:text-black rounded-xl border border-white/10 transition-all font-medium text-sm"
                  >
                    View Source <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Floating Chat */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-[#121214] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
            >
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-sm">TrendBot Assistant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Online</span>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      m.role === "user" 
                        ? "bg-purple-600 text-white rounded-tr-none" 
                        : "bg-white/10 text-gray-200 border border-white/5 rounded-tl-none"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white/[0.02] border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about a project..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  <button 
                    onClick={handleSend}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-500 hover:bg-purple-400 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full shadow-xl shadow-purple-500/20 flex items-center justify-center hover:scale-110 transition-all active:scale-95 group"
        >
          {chatOpen ? (
            <ChevronRight className="w-7 h-7 text-white rotate-90" />
          ) : (
            <MessageSquare className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-gray-500 text-sm">Built for builders. Updated weekly on Mondays.</p>
      </footer>
    </div>
  );
}
