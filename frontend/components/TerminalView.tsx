import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { Message } from "@/hooks/useSimulationSocket";

interface TerminalViewProps {
  logs: Message[];
}

export default function TerminalView({ logs }: TerminalViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full border border-neon-green/30 bg-black/90 rounded-lg backdrop-blur-md overflow-hidden shadow-[0_0_20px_-5px_rgba(10,255,0,0.15)] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-green/20 bg-neon-green/5">
        <div className="flex items-center gap-2 text-neon-green">
          <Terminal size={14} />
          <h2 className="font-bold tracking-widest text-sm">SHADOW_KERNEL</h2>
        </div>
        <div className="flex gap-2">
          <Activity size={14} className="text-neon-green/50 animate-pulse" />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 text-xs md:text-sm font-mono scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent"
      >
        <div className="text-neon-green/40 mb-4 pb-2 border-b border-neon-green/10">
          {">"} SYSTEM_INIT...
          <br />
          {">"} DUAL_AGENT_LINK_ESTABLISHED
          <br />
          {">"} OBSERVING_INTERVIEW_STREAM...
        </div>

        <AnimatePresence initial={false}>
          {logs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 text-neon-green/90 border-l-2 border-neon-green/30 pl-3 py-1 bg-neon-green/5"
            >
              <span className="opacity-50 select-none">{">"}</span>
              <div className="wrap-break-word w-full">
                <LogContent content={log.content} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="text-neon-green/30 animate-pulse mt-4">
            _ WAITING_FOR_DATA_STREAM
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="px-4 py-1 bg-neon-green/5 border-t border-neon-green/10 text-[10px] text-neon-green/60 flex justify-between">
        <span>MEM: 64TB</span>
        <span>CPU: 12%</span>
        <span>NURAL_LINK: ACTIVE</span>
      </div>
    </div>
  );
}

const LogContent = ({ content }: { content: string }) => {
  try {
    const data = JSON.parse(content);
    if (data.score !== undefined && data.pros && data.cons) {
      return (
        <div className="flex flex-col gap-2 mt-1 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-neon-green font-bold bg-neon-green/10 px-1">
              SCORE: {data.score}/10
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            <div className="bg-neon-green/5 p-2 rounded border border-neon-green/10">
              <div className="text-[10px] tracking-widest opacity-70 mb-1">
                PROS
              </div>
              <ul className="list-disc list-inside text-xs space-y-1">
                {data.pros.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-500/10 p-2 rounded border border-red-500/20 text-red-300">
              <div className="text-[10px] tracking-widest opacity-70 mb-1 text-red-400">
                CONS
              </div>
              <ul className="list-disc list-inside text-xs space-y-1">
                {data.cons.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20 text-blue-300 mt-1">
            <div className="text-[10px] tracking-widest opacity-70 mb-1 text-blue-400">
              TIP PROTOCOL
            </div>
            <div className="text-xs">{data.improvement_tip}</div>
          </div>
        </div>
      );
    }
  } catch (e) {
    // Not JSON, render as text
  }
  return <span>{content}</span>;
};
