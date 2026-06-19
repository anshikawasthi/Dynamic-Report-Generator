"use client";

import { useState, useRef, useEffect } from "react";
import type { UniversalContract } from "@/lib/types";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";

// TODO: COPILOTKIT — Replace this entire mock engine with:
// import { useCoAgent } from "@copilotkit/react-core";
// const { run } = useCoAgent({ name: "report-agent" });

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contract: UniversalContract;
}

// Mock response engine — matches keywords in user message against live report data
function generateMockResponse(query: string, contract: UniversalContract): string {
  const q = query.toLowerCase();
  const { kpis, atRiskAssets, meta } = contract;

  // KPI lookups
  if (q.includes("pm") || q.includes("preventive")) {
    const kpi = kpis.find((k) => k.label === "PM Compliance");
    if (kpi)
      return `PM Compliance is currently at **${kpi.value}** — ${kpi.mom} MOM, ${kpi.yoy} YoY. Target status: ${kpi.targetStatus.replace("_", " ")}.`;
  }
  if (q.includes("reactive")) {
    const kpi = kpis.find((k) => k.label === "Reactive Compliance");
    if (kpi)
      return `Reactive Compliance is at **${kpi.value}**. MOM: ${kpi.mom} (${kpi.momDirection}), YoY: ${kpi.yoy}.`;
  }
  if (q.includes("csat") || q.includes("satisfaction")) {
    const kpi = kpis.find((k) => k.label === "CSAT");
    if (kpi)
      return `Customer Satisfaction (CSAT) score is **${kpi.value}** — ${kpi.mom} MOM. Target: ${kpi.target}.`;
  }

  // Asset lookups
  if (q.includes("chiller")) {
    const a = atRiskAssets.find((x) => x.name.toLowerCase().includes("chiller"));
    if (a)
      return `**${a.name}** is a ${a.criticality} ${a.assetType} asset with a risk score of **${a.riskScore}/100**. Recommendation: ${a.recommendation}. ${a.savingsEstimate ? `Estimated savings: ${a.savingsEstimate}.` : ""}`;
  }
  if (q.includes("boiler")) {
    const a = atRiskAssets.find((x) => x.name.toLowerCase().includes("boiler"));
    if (a)
      return `**${a.name}** risk score: ${a.riskScore}. Issue: ${a.recommendation}.`;
  }
  if (q.includes("vav")) {
    const a = atRiskAssets.find((x) => x.name.toLowerCase().includes("vav"));
    if (a)
      return `**${a.name}** (${a.assetType}, ${a.criticality}) has a risk score of ${a.riskScore}. ${a.recommendation}.`;
  }
  if (q.includes("risk") || q.includes("asset")) {
    const top = [...atRiskAssets].sort((a, b) => b.riskScore - a.riskScore)[0];
    return `The highest-risk asset right now is **${top.name}** with a risk score of **${top.riskScore}**. Recommendation: ${top.recommendation}.`;
  }

  // Summary
  if (q.includes("summary") || q.includes("overview") || q.includes("how")) {
    const pm = kpis.find((k) => k.label === "PM Compliance");
    const csat = kpis.find((k) => k.label === "CSAT");
    return `**${meta.customerName}** (${meta.contractTier} tier) — PM Compliance: ${pm?.value}, CSAT: ${csat?.value}. ${atRiskAssets.length} at-risk assets flagged. Overall: performing close to target.`;
  }

  return `I can answer questions about this report for **${meta.customerName}**. Try asking about PM Compliance, Reactive Compliance, CSAT, or specific assets like the Chiller or Boiler.\n\n_Note: AI responses are mocked — connect CopilotKit + an LLM to enable live answers._`;
}

export default function ChatSidebar({ open, onClose, contract }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: `Hi! I'm your report assistant for **${contract.meta.customerName}**. Ask me anything about this service performance report.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // TODO: COPILOTKIT — Replace setTimeout below with:
    // run({ messages: [...messages, userMsg] }, (chunk) => { /* stream response */ });
    setTimeout(() => {
      const reply = generateMockResponse(trimmed, contract);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply },
      ]);
      setTyping(false);
    }, 600);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay on mobile */}
      <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Report Assistant</p>
              <p className="text-xs text-gray-400">Mock AI · CopilotKit ready</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === "assistant" ? "bg-blue-100" : "bg-gray-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-3 h-3 text-blue-600" />
                ) : (
                  <User className="w-3 h-3 text-gray-600" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-gray-50 text-gray-800 border border-gray-100"
                    : "bg-blue-600 text-white"
                }`}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br />"),
                }}
              />
            </div>
          ))}

          {typing && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-blue-600" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about KPIs, assets…"
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            {/* TODO: COPILOTKIT — remove this notice after wiring in real LLM */}
            Mock responses · Connect CopilotKit for live AI
          </p>
        </div>
      </aside>
    </>
  );
}
