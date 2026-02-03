"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu } from "lucide-react";
import { useSimulationSocket } from "@/hooks/useSimulationSocket";
import ChatInterface from "@/components/ChatInterface";
import TerminalView from "@/components/TerminalView";

export default function Home() {
  const [started, setStarted] = useState(false);
  const { isConnected, messages, instructorFeedback, sendMessage } = useSimulationSocket();

  return (
    <main className="flex min-h-screen flex-col bg-cyber-black text-neon-blue relative overflow-hidden">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#121212_1px,transparent_1px),linear-gradient(to_bottom,#121212_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="landing"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="flex flex-col items-center justify-center min-h-screen p-24"
          >
             <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="z-10 flex flex-col items-center gap-8 border border-neon-blue/30 bg-cyber-black/80 p-12 rounded-lg backdrop-blur-sm shadow-[0_0_50px_-12px_rgba(0,243,255,0.25)]"
              >
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-neon-blue blur opacity-20 animate-pulse"></div>
                  <Cpu className="w-16 h-16 text-neon-blue relative z-10" />
                </div>

                <div className="text-center space-y-2">
                  <h1 className="text-6xl font-bold tracking-tighter shadow-neon text-transparent bg-clip-text bg-gradient-to-b from-white to-neon-blue">
                    THE SHADOW
                  </h1>
                  <p className="text-xl text-neon-pink font-light tracking-[0.2em] uppercase">
                    Instructor Protocol
                  </p>
                </div>

                <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-neon-blue to-transparent my-4" />

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStarted(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-neon-blue/10 border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all duration-300 font-bold tracking-wide uppercase text-sm group"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Initialize Sim</span>
                  </button>
                </div>
                
                <div className="font-mono text-xs text-neon-green/50 mt-8">
                  SYSTEM_STATUS: {isConnected ? "ONLINE" : "OFFLINE_"}
                </div>
              </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-10 w-full h-screen p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
             {/* Left Column: The Shadow Instructor (Terminal View) */}
             <div className="lg:col-span-4 h-[40vh] lg:h-full order-2 lg:order-1">
                <TerminalView logs={instructorFeedback} />
             </div>

             {/* Right Column: The Interview (Chat View) */}
             <div className="lg:col-span-8 h-[55vh] lg:h-full order-1 lg:order-2">
                <ChatInterface 
                  messages={messages} 
                  onSendMessage={sendMessage}
                  disabled={!isConnected}
                />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
