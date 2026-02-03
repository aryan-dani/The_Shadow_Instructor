import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot } from 'lucide-react';
import { Message } from '@/hooks/useSimulationSocket';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  disabled?: boolean;
}

export default function ChatInterface({ messages, onSendMessage, disabled }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
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
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full border border-neon-blue/30 bg-cyber-black/80 rounded-lg backdrop-blur-md overflow-hidden shadow-[0_0_20px_-5px_rgba(0,243,255,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-blue/20 bg-neon-blue/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
          <h2 className="text-neon-blue font-bold tracking-widest text-sm">INTERVIEW_PROTOCOL</h2>
        </div>
        <div className="text-xs text-neon-blue/50 font-mono">SECURE_CHANNEL</div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm scrollbar-thin scrollbar-thumb-neon-blue/20 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`p-2 rounded border shrink-0 h-fit ${
                msg.role === 'user' 
                  ? 'border-neon-pink/50 bg-neon-pink/10 text-neon-pink' 
                  : 'border-neon-blue/50 bg-neon-blue/10 text-neon-blue'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`max-w-[80%] p-3 rounded-sm border ${
                msg.role === 'user'
                  ? 'border-neon-pink/20 bg-neon-pink/5 text-gray-200'
                  : 'border-neon-blue/20 bg-neon-blue/5 text-gray-300'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.timestamp && (
                  <div className="mt-1 text-[10px] opacity-40 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-neon-blue/20 bg-black/40">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder={disabled ? "CONNECTING..." : "Type response..."}
            className="w-full bg-cyber-back border border-neon-blue/30 rounded py-3 pl-4 pr-12 text-neon-blue placeholder:text-neon-blue/30 focus:outline-none focus:border-neon-blue focus:shadow-[0_0_10px_rgba(0,243,255,0.2)] transition-all font-mono text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="absolute right-2 p-1.5 rounded bg-neon-blue/10 text-neon-blue hover:bg-neon-blue hover:text-black disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neon-blue transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
