import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Sparkles } from "lucide-react";
import { Message } from "@/hooks/useSimulationSocket";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  disabled?: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  disabled,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`p-2 rounded-full shrink-0 h-fit ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-indigo-600 text-white"
                }`}
              >
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-700 text-slate-100 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                {msg.timestamp && (
                  <div className={`mt-1 text-[10px] opacity-60 text-right`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 gap-2">
              <Sparkles size={24} />
              <span className="text-xs">Conversation will appear here...</span>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-700/50 bg-slate-800/30"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder={
              disabled ? "Connecting to interviewer..." : "Type a message..."
            }
            className="w-full bg-slate-900/80 border border-slate-700 rounded-full py-3 pl-4 pr-12 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="absolute right-2 p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-transparent disabled:text-slate-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
