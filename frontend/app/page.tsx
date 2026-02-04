"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageSquare, Monitor } from "lucide-react";
import { useSimulationSocket } from "@/hooks/useSimulationSocket";
import ChatInterface from "@/components/ChatInterface";
import LiveSession from "@/components/LiveSession";
import ResumeUploader from "@/components/ResumeUploader";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Software Engineer");

  const { isConnected, messages, sendMessage, sendAudio, connect, disconnect } =
    useSimulationSocket("ws://localhost:8000/ws/simulation", selectedRole);

  const handleStartInterview = (role: string) => {
    setSelectedRole(role);
    setStarted(true);
    // Give a slight delay for UI transition before connecting socket
    setTimeout(() => {
      connect();
    }, 500);
  };

  const handleStop = () => {
    disconnect();
    setStarted(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-900 text-slate-100 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-x-0 top-0 h-125 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <ResumeUploader onComplete={handleStartInterview} />
          </motion.div>
        ) : (
          <motion.div
            key="interview-room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen p-4 md:p-6 gap-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStop}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    Interview Session
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedRole} •{" "}
                    {isConnected ? "Connected" : "Connecting..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-amber-500 animate-pulse"}`}
                />
                GEMINI_LIVE_PROTOCOL
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
              {/* Main Stage (Video) */}
              <div className="lg:col-span-2 h-full flex flex-col gap-4">
                <div className="flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800">
                  {/* The User's Video Feed (Self View) */}
                  <div className="absolute inset-0">
                    <LiveSession
                      onAudioData={sendAudio}
                      isConnected={isConnected}
                    />
                  </div>

                  {/* Overlay for Interviewer Persona (Optional Visuals could go here) */}
                </div>
              </div>

              {/* Side Panel (Transcript/Notes) */}
              <div className="h-full flex flex-col bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-400" />
                    Transcript
                  </h2>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <ChatInterface
                    messages={messages}
                    onSendMessage={sendMessage}
                    disabled={!isConnected}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
