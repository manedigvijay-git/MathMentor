"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MathMessageRenderer } from "@/components/common/MathMessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  analysis?: {
    domain: string;
    difficulty: string;
    verification: string;
    reasoningPath: string[];
  };
}

export function ChatGPTView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "assistant",
      content: "Hello! I am **MathMentor AI**. Ask me any mathematical question, request a step-by-step proof, or upload your work for a diagnostic check.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<Message["analysis"] | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const inFlightRef = useRef(false);

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim();
    const tempImageMsg = messages.find(m => m.id === "temp-image");
    
    if ((!text && !tempImageMsg) || isThinking || inFlightRef.current) return;

    inFlightRef.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev.filter(m => m.id !== "temp-image"), userMessage]);
    if (!customPrompt) setInput("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          question: text,
          prompt: text,
          image: tempImageMsg?.content,
          messages: messages.filter(m => m.id !== "temp-image").map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || data.error) {
        const statusCode = data.error?.status || res.status;
        let errorMsg = data.error?.message || (typeof data.error === "string" ? data.error : "Gemini connection failed");

        if (data.errorType === "ALL_MODELS_UNAVAILABLE" || statusCode === 429) {
          errorMsg = "Gemini is temporarily unavailable because the available model quotas have been reached.";
        }

        const formattedError = (data.errorType === "ALL_MODELS_UNAVAILABLE" || statusCode === 429)
          ? errorMsg
          : `Gemini API error (${statusCode}):\n${errorMsg}`;
        throw new Error(formattedError);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.text || "Calculation complete.",
        provider: data.model || data.provider,
        analysis: data.analysis,
      };

      setMessages((prev) => [...prev, aiMessage]);
      if (data.analysis) {
        setActiveAnalysis(data.analysis);
      }
    } catch (err: any) {
      const msgText = err.message && (err.message.startsWith("Gemini") || err.message.startsWith("Gemini's"))
        ? err.message
        : `Gemini API error (500):\n${err.message || "Failed to connect to Gemini API."}`;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: msgText,
        },
      ]);
    } finally {
      setIsThinking(false);
      inFlightRef.current = false;
    }
  };




  return (
    <div className="flex h-full w-full bg-[#070B16] text-[#F4F7FF] relative overflow-hidden">
      {/* Central Chat Window */}
      <div className="flex-1 flex flex-col h-full relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Top Header Status */}
        <div className="flex items-center justify-between border-b border-[#1F293D] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/30 border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-400 shadow-[0_0_15px_rgba(76,215,246,0.15)]">
              M
            </div>
            <div>
              <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
                MathMentor AI
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                  Gemini Math Engine
                </span>
              </h2>
              <p className="text-xs text-[#A8B1C7]">Personal Mathematics Tutor • Socratic Reasoning</p>
            </div>
          </div>
          {activeAnalysis && (
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#151D30] hover:bg-[#1E293B] border border-[#2D3748] text-cyan-400 flex items-center gap-2 transition-all"
            >
              <span>{showAnalysis ? "Hide Analysis Panel" : "View Deep Analysis"}</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-none">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0 text-cyan-400 text-sm font-semibold mt-1">
                  ∑
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed border ${
                  msg.role === "user"
                    ? "bg-[#1E293B] border-[#334155] text-white"
                    : "bg-[#0F172A]/80 border-[#1E293B] text-[#E2E8F0] shadow-lg"
                }`}
              >
                <MathMessageRenderer content={msg.content} />

                {msg.analysis && (
                  <div className="mt-3 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Domain: {msg.analysis.domain}</span>
                    <button
                      onClick={() => {
                        setActiveAnalysis(msg.analysis!);
                        setShowAnalysis(true);
                      }}
                      className="text-cyan-400 hover:underline"
                    >
                      Explore Deep Proof →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 items-center">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-sm animate-spin">
                ⚙
              </div>
              <div className="p-4 rounded-2xl bg-[#0F172A]/60 border border-[#1E293B] text-xs text-[#94A3B8] flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                MathMentor is thinking... Analyzing equations &amp; verifying steps
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="flex gap-2 my-3 overflow-x-auto py-1 no-scrollbar text-xs">
          <button
            onClick={() => handleSend("Solve 2x + 5 = 15 step by step")}
            className="px-3 py-1.5 rounded-full bg-[#111827] hover:bg-[#1F293D] border border-[#1F293D] text-[#94A3B8] hover:text-white transition-all whitespace-nowrap"
          >
            ⚡ Solve 2x + 5 = 15
          </button>
          <button
            onClick={() => handleSend("Explain fractions like I'm a beginner")}
            className="px-3 py-1.5 rounded-full bg-[#111827] hover:bg-[#1F293D] border border-[#1F293D] text-[#94A3B8] hover:text-white transition-all whitespace-nowrap"
          >
            💡 Explain Fractions
          </button>
          <button
            onClick={() => handleSend("What is 25% of 800?")}
            className="px-3 py-1.5 rounded-full bg-[#111827] hover:bg-[#1F293D] border border-[#1F293D] text-[#94A3B8] hover:text-white transition-all whitespace-nowrap"
          >
            🔢 25% of 800
          </button>
          <button
            onClick={() => handleSend("Check my work: 2x + 5 = 15 => 2x = 15 => x = 7.5")}
            className="px-3 py-1.5 rounded-full bg-[#111827] hover:bg-[#1F293D] border border-[#1F293D] text-[#94A3B8] hover:text-white transition-all whitespace-nowrap"
          >
            🔍 Check My Work
          </button>
        </div>

        {/* ChatGPT Style Composer */}
        <div className="relative flex flex-col w-full bg-[#0F172A] border border-[#1E293B] rounded-2xl shadow-2xl p-2 focus-within:border-cyan-500/50 transition-all">
          {messages.some(m => m.id === "temp-image") && (
             <div className="flex px-3 pb-2 pt-1">
                 <div className="relative w-16 h-16 rounded overflow-hidden border border-[#1E293B]">
                     <img src={messages.find(m => m.id === "temp-image")?.content} alt="Upload preview" className="object-cover w-full h-full opacity-80" />
                     <button onClick={() => setMessages(prev => prev.filter(m => m.id !== "temp-image"))} className="absolute top-0 right-0 bg-black/50 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl hover:bg-black">✕</button>
                 </div>
             </div>
          )}
          
          <div className="flex items-center w-full">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="imageUpload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const result = e.target?.result as string;
                    // Store temporarily in messages or separate state
                    setMessages(prev => [...prev.filter(m => m.id !== "temp-image"), { id: "temp-image", role: "user", content: result }]);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label htmlFor="imageUpload" className="p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-[#1E293B] transition-all cursor-pointer">
              📷
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask MathMentor anything (e.g. Solve 2x + 5 = 15, explain calculus...)"
              className="flex-1 bg-transparent px-3 text-sm text-white placeholder-[#64748B] focus:outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !messages.some(m => m.id === "temp-image")) || isThinking}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#070B16] font-semibold text-sm transition-all disabled:opacity-40 disabled:hover:bg-cyan-500"
            >
              Send ↑
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Deep Analysis Split Panel */}
      <AnimatePresence>
        {showAnalysis && activeAnalysis && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="w-80 h-full bg-[#0B1020] border-l border-[#1F293D] p-6 flex flex-col gap-6 relative z-20 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="font-semibold text-sm tracking-wider uppercase text-cyan-400">Deep Mathematical Analysis</h3>
              <button onClick={() => setShowAnalysis(false)} className="text-[#94A3B8] hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                <span className="text-[#64748B] block mb-1">Problem Classification</span>
                <span className="font-semibold text-white">{activeAnalysis.domain}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                <span className="text-[#64748B] block mb-1">Axiomatic Verification</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ {activeAnalysis.verification}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[#64748B] block">Reasoning Path Execution</span>
                {activeAnalysis.reasoningPath.map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#111827] border border-[#1F293D] text-[#E2E8F0] font-mono text-[11px]">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
