import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { Message } from '@/hooks/useSimulationSocket';

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
            <Activity size={14} className="text-neon-green/50 animate-pulse"/>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 text-xs md:text-sm font-mono scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent"
      >
         <div className="text-neon-green/40 mb-4 pb-2 border-b border-neon-green/10">
            {'>'} SYSTEM_INIT...<br/>
            {'>'} DUAL_AGENT_LINK_ESTABLISHED<br/>
            {'>'} OBSERVING_INTERVIEW_STREAM...
         </div>

        <AnimatePresence initial={false}>
          {logs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 text-neon-green/90 border-l-2 border-neon-green/30 pl-3 py-1 bg-neon-green/5"
            >
              <span className="opacity-50 select-none">{'>'}</span>
              <div className="break-words w-full">
                {log.content}
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
