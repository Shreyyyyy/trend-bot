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
  const [showToast, setShowToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
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
      
      // Trigger Success Toast
      setShowToast({ show: true, message: "INTELLIGENCE SYNC COMPLETED", type: 'success' });
      setTimeout(() => setShowToast(prev => ({ ...prev, show: false })), 3000);
      
    } catch (e: any) {
      setShowToast({ show: true, message: `SYNC FAILED: ${e.message}`, type: 'error' });
      setTimeout(() => setShowToast(prev => ({ ...prev, show: false })), 4000);
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

  // Constants for Pie Chart - Enlarged
  const size = 720;
  const radius = size / 2.3;
  const innerRadius = radius * 0.5;
  const centerX = size / 2;
  const centerY = size / 2;

  const colors = [
    "#ef4444", // Red
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
  ];

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="h-screen w-screen bg-[#02040a] text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 relative">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
      </div>

      <div className="flex-grow flex overflow-hidden relative z-10">
        {/* Main Section: Interactive Pie Chart */}
        <div className={`${chatOpen ? "hidden md:flex md:w-[58%]" : "w-full"} h-full flex flex-col items-center justify-center transition-all duration-500 ease-in-out overflow-hidden px-4 md:px-10`}>

          {/* Header (Minimal) */}
          <div className="absolute top-6 left-6 right-6 md:top-10 md:left-10 md:right-auto flex flex-row items-center justify-between md:items-center gap-4 md:gap-10 z-50 border-b border-white/5 pb-4 md:border-none md:pb-0">
            <div>
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-blue-500 font-black tracking-[0.4em] text-[8px] md:text-[10px] uppercase mb-1 flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                Strategic Intelligence
              </motion.div>
              <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-2xl md:text-4xl font-black tracking-tighter text-white">
                Market Signals
              </motion.h1>
              <div className="flex items-center gap-3 mt-1 md:mt-2">
                <span className="h-px w-4 md:w-6 bg-white/20" />
                <p className="text-[10px] md:text-sm text-white/60 font-black tracking-wider uppercase">
                  {dateRange || "Ready to Scan"}
                </p>
              </div>
            </div>

            <div className="relative group/sync">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`group relative flex items-center gap-2 text-[9px] md:text-[11px] font-black text-white bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-400 rounded-xl px-4 py-2.5 md:px-6 md:py-3 transition-all active:scale-95 shadow-2xl overflow-hidden ${refreshing ? "cursor-wait opacity-80" : "cursor-pointer"}`}
              >
                <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-1000 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                <span className="relative z-10 hidden sm:inline">{refreshing ? "SYNCING..." : "SYNC HUB"}</span>
                <span className="relative z-10 sm:hidden">{refreshing ? "" : "SYNC"}</span>
                {refreshing && <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />}
              </button>
            </div>
          </div>

          {/* Developer Credit - Top Right */}
          <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
            <a 
              href="https://github.com/shreyyyyy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-end opacity-40 hover:opacity-100 transition-all duration-500 group cursor-pointer"
            >
              <span className="text-[8px] md:text-[9px] font-black tracking-[0.4em] text-white/50 group-hover:text-blue-500 uppercase mb-0.5 md:mb-1 transition-colors flex items-center gap-2">
                Architect <ExternalLink className="w-2 md:w-2.5 h-2 md:h-2.5" />
              </span>
              <span className="text-[9px] md:text-[11px] font-black tracking-widest text-white group-hover:text-blue-400 uppercase transition-colors">Shreyans Jain</span>
            </a>
          </div>

          {/* Intelligence Index - Responsive Fixed Access */}
          {!chatOpen && (
            <div className="absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2 left-0 right-0 bottom-6 lg:bottom-auto z-50 flex lg:flex-col flex-row gap-3 px-6 lg:px-0 overflow-x-auto lg:overflow-x-visible no-scrollbar">
              <div className="hidden lg:flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Active Signals</span>
              </div>
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`group relative flex items-center justify-between gap-4 lg:gap-6 p-3 lg:p-4 rounded-2xl border transition-all duration-300 w-[180px] lg:w-64 flex-none lg:flex-auto ${
                    hoveredIndex === i 
                      ? "bg-blue-600/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[8px] lg:text-[9px] font-black text-blue-500/60 uppercase whitespace-nowrap">Signal 0{i + 1}</span>
                    <p className="text-[10px] lg:text-xs font-black text-gray-200 truncate group-hover:text-white transition-colors">{p.name}</p>
                  </div>
                  {p.url && (
                    <a 
                      href={p.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 lg:p-2 rounded-xl bg-white/5 hover:bg-blue-600 text-gray-500 hover:text-white transition-all active:scale-90 flex-none"
                    >
                      <ExternalLink className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
            {loading ? (
              <div className="w-40 h-40 md:w-80 md:h-80 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
            ) : projects.length === 0 ? (
              <div className="text-center group cursor-pointer" onClick={handleRefresh}>
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500/20 transition-colors">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-gray-700 group-hover:text-blue-400" />
                </div>
                <h3 className="text-xs md:text-sm font-black text-white/30 uppercase tracking-widest">No Signals Loaded</h3>
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-full h-full">
                {/* SVG Pie Chart */}
                <div 
                  className="scale-[0.55] sm:scale-[0.75] md:scale-100 transition-transform duration-1000 flex items-center justify-center"
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <svg 
                    width={size} 
                    height={size} 
                    viewBox={`0 0 ${size} ${size}`} 
                    className="transform -rotate-90 max-w-none drop-shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                  >
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
                          fill={isHovered ? `${colors[i % colors.length]}10` : `${colors[i % colors.length]}25`}
                          stroke={isHovered ? colors[i % colors.length] : `${colors[i % colors.length]}40`}
                          strokeWidth={isHovered ? "3" : "1.5"}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onClick={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                              setHoveredIndex(hoveredIndex === i ? null : i);
                            } else {
                              handleSend(`Strategic breakdown of ${p.name}`);
                            }
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            opacity: hoveredIndex !== null && !isHovered ? 0.3 : 1,
                            scale: isHovered ? 1.02 : 1
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="cursor-pointer transition-all duration-500"
                        />
                      );
                    })}
                    <circle cx={centerX} cy={centerY} r={radius + 40} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="5 10" className="animate-[spin_80s_linear_infinite]" />
                  </svg>
                </div>

                {/* Central Intelligence HUD */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-6">
                  <div className="max-w-[320px] md:max-w-[450px] w-full">
                    <AnimatePresence mode="wait">
                      {hoveredIndex === null ? (
                        <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="space-y-4">
                          <div className="w-12 h-12 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                            <Bot className="w-6 h-6 md:w-10 md:h-10 text-white/20" />
                          </div>
                          <h4 className="text-[10px] md:text-sm font-black text-white/20 uppercase tracking-[0.5em]">System Idle</h4>
                          <p className="text-[10px] md:text-sm text-gray-600 font-bold leading-relaxed">Select a segment to<br/>initiate data analysis</p>
                        </motion.div>
                      ) : (
                        <motion.div key={hoveredIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 md:space-y-10">
                          <div className="space-y-2 md:space-y-4">
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em]" style={{ color: colors[hoveredIndex % colors.length] }}>Signal 0{hoveredIndex + 1}</span>
                            <h2 className="text-3xl md:text-6xl font-black tracking-tighter leading-tight text-white drop-shadow-2xl">{projects[hoveredIndex].name}</h2>
                            <div className="flex items-center justify-center gap-2 text-[10px] md:text-[12px] text-gray-400 font-black uppercase mt-2 md:mt-4 tracking-[0.2em] border border-white/10 bg-white/5 py-1.5 px-4 rounded-full w-fit mx-auto">
                               <Globe className="w-3 h-3 md:w-4 md:h-4" /> {projects[hoveredIndex].market}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-6 md:gap-10 text-left">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em]" style={{ color: colors[hoveredIndex % colors.length] }}>
                                <Target className="w-3.5 h-3.5 md:w-5 md:h-5 opacity-60" /> Hypothesis
                              </div>
                              <p className="text-sm md:text-lg text-gray-400 font-bold leading-snug italic line-clamp-3 md:line-clamp-none">{projects[hoveredIndex].why}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em]" style={{ color: colors[hoveredIndex % colors.length] }}>
                                <Zap className="w-3.5 h-3.5 md:w-5 md:h-5 opacity-60" /> Execution
                              </div>
                              <p className="text-base md:text-2xl text-gray-200 font-black leading-tight tracking-tight">{projects[hoveredIndex].build}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* External Labels for Pie */}
                  {projects.map((p, i) => {
                    const sliceSize = 1 / projects.length;
                    const angle = (i * sliceSize + sliceSize / 2) * 2 * Math.PI - Math.PI / 2;
                    const labelRadius = radius + 130;
                    const xOffset = Math.cos(angle) * labelRadius;
                    const yOffset = Math.sin(angle) * labelRadius;
                    return (
                      <motion.div
                        key={i}
                        className="absolute text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] text-center whitespace-nowrap pointer-events-none hidden md:block"
                        style={{ 
                          left: `calc(50% + ${xOffset}px)`,
                          top: `calc(50% + ${yOffset}px)`,
                          transform: 'translate(-50%, -50%)' 
                        }}
                        animate={{ 
                          color: hoveredIndex === i ? colors[i % colors.length] : "#4b5563",
                          scale: hoveredIndex === i ? 1.3 : 1,
                          opacity: hoveredIndex === i || hoveredIndex === null ? 1 : 0.2,
                          filter: hoveredIndex === i ? `drop-shadow(0 0 10px ${colors[i % colors.length]}50)` : "none"
                        }}
                      >
                        {p.name.split(" ").slice(0, 2).join(" ")}
                      </motion.div>
                    );
                  })}
                </div>
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
              className="fixed inset-0 md:relative md:inset-auto flex-none w-full md:w-[42%] border-l border-white/10 bg-[#0d1117]/95 md:bg-[#0d1117]/50 backdrop-blur-3xl flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.4)] z-[100]"
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
                    <div className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-sm ${m.role === "user" ? "bg-blue-600 text-white font-medium rounded-tr-sm" : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-sm"
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

      {/* Sync Completion Notification (Toast) */}
      <AnimatePresence>
        {showToast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-8 py-4 rounded-2xl border backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
              showToast.type === 'success' 
                ? "bg-blue-600/10 border-blue-500/30 text-blue-400" 
                : "bg-red-600/10 border-red-500/30 text-red-400"
            }`}
          >
            {showToast.type === 'success' ? <Zap className="w-5 h-5 animate-pulse" /> : <X className="w-5 h-5" />}
            <span className="text-xs font-black tracking-[0.3em] uppercase">{showToast.message}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
