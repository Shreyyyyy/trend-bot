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

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Constants for Pie Chart
  const size = 560;
  const radius = size / 2.5;
  const innerRadius = radius * 0.45;
  const centerX = size / 2;
  const centerY = size / 2;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="h-screen w-screen bg-[#02040a] text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
      </div>

      <div className="flex-grow flex overflow-hidden relative z-10">
        {/* Main Section: Interactive Pie Chart */}
        <div className={`${chatOpen ? "w-[58%]" : "w-full"} h-full flex flex-col items-center justify-center transition-all duration-500 ease-in-out overflow-hidden px-10`}>
          
          {/* Header (Minimal) */}
          <div className="absolute top-8 left-10 flex items-center gap-6">
            <div>
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-blue-500 font-black tracking-[0.3em] text-[10px] uppercase mb-1">
                Trend Ecosystem
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-black tracking-tighter">
                Market Signals
              </motion.h1>
              <p className="text-[10px] text-gray-600 font-bold tracking-widest uppercase mt-1">{dateRange || "Awaiting Scan"}</p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="group flex items-center gap-2 text-[10px] font-black text-white/50 hover:text-white bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 rounded-xl px-4 py-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Scanning..." : "Sync"}
            </button>
          </div>

          <div className="relative flex items-center justify-center w-full h-full">
            {loading ? (
              <div className="w-80 h-80 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
            ) : projects.length === 0 ? (
              <div className="text-center group cursor-pointer" onClick={handleRefresh}>
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/20 transition-colors">
                  <Zap className="w-8 h-8 text-gray-700 group-hover:text-blue-400" />
                </div>
                <h3 className="text-sm font-black text-white/30 uppercase tracking-widest">No Signals Loaded</h3>
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                {/* SVG Pie Chart */}
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                  {projects.map((p, i) => {
                    const sliceSize = 1 / projects.length;
                    const startPercent = i * sliceSize;
                    const endPercent = (i + 1) * sliceSize;
                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    const largeArcFlag = sliceSize > 0.5 ? 1 : 0;
                    
                    const pathData = [
                      `M ${centerX + startX * radius} ${centerY + startY * radius}`,
                      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${centerX + endX * radius} ${centerY + endY * radius}`,
                      `L ${centerX + endX * innerRadius} ${centerY + endY * innerRadius}`,
                      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${centerX + startX * innerRadius} ${centerY + startY * innerRadius}`,
                      "Z",
                    ].join(" ");

                    const isHovered = hoveredIndex === i;

                    return (
                      <motion.path
                        key={i}
                        d={pathData}
                        fill={isHovered ? "rgba(59, 130, 246, 0.4)" : "rgba(255, 255, 255, 0.03)"}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1.5"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => handleSend(`Strategic breakdown of ${p.name}`)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: isHovered ? 1.05 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="cursor-pointer transition-colors duration-300"
                      />
                    );
                  })}
                  
                  {/* Decorative Outer Rings */}
                  <circle cx={centerX} cy={centerY} r={radius + 30} fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" strokeDasharray="4 8" className="animate-[spin_60s_linear_infinite]" />
                  <circle cx={centerX} cy={centerY} r={radius + 60} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.5" />
                </svg>

                {/* Central Intelligence HUD */}
                <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center max-w-[320px]">
                  <AnimatePresence mode="wait">
                    {hoveredIndex === null ? (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="space-y-2"
                      >
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                          <Bot className="w-6 h-6 text-blue-500" />
                        </div>
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Signal Lab</h4>
                        <p className="text-xs text-gray-500 font-medium">Hover a segment to decode<br/>market intelligence</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={hoveredIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Signal 0{hoveredIndex + 1}</span>
                          <h2 className="text-2xl font-black tracking-tight leading-none">{projects[hoveredIndex].name}</h2>
                          <div className="flex items-center justify-center gap-2 text-[9px] text-gray-600 font-bold uppercase mt-2">
                             <Globe className="w-2.5 h-2.5" /> {projects[hoveredIndex].market}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 px-4 text-left">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-400/80 uppercase tracking-[0.2em]">
                              <Target className="w-3 h-3" /> Why
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic">{projects[hoveredIndex].why}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[8px] font-black text-purple-400/80 uppercase tracking-[0.2em]">
                              <Zap className="w-3 h-3" /> Build
                            </div>
                            <p className="text-[11px] text-gray-300 font-bold leading-relaxed">{projects[hoveredIndex].build}</p>
                          </div>
                        </div>
                        
                        <div className="pt-2 text-[8px] font-black text-white/20 uppercase tracking-widest animate-pulse">
                          Click to analyze in detail
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* External Labels for Pie */}
                {projects.map((p, i) => {
                  const sliceSize = 1 / projects.length;
                  const angle = (i * sliceSize + sliceSize / 2) * 2 * Math.PI - Math.PI / 2;
                  const labelRadius = radius + 80;
                  const x = centerX + Math.cos(angle) * labelRadius;
                  const y = centerY + Math.sin(angle) * labelRadius;
                  
                  return (
                    <motion.div
                      key={i}
                      className="absolute text-[9px] font-black text-gray-500 uppercase tracking-widest text-center whitespace-nowrap pointer-events-none"
                      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                      animate={{ 
                        color: hoveredIndex === i ? "#fff" : "#4b5563",
                        scale: hoveredIndex === i ? 1.1 : 1
                      }}
                    >
                      {p.name.split(" ").slice(0, 2).join(" ")}
                    </motion.div>
                  );
                })}
              </div>
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
