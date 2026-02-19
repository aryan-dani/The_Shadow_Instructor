import { motion } from "framer-motion";
import { Settings, Flame } from "lucide-react";
import { InterviewState } from "../types";

interface InterviewSettingsProps {
  persona: InterviewState["persona"];
  setPersona: (p: InterviewState["persona"]) => void;
  voice: InterviewState["voice"];
  setVoice: (v: InterviewState["voice"]) => void;
  difficulty: InterviewState["difficulty"];
  setDifficulty: (d: InterviewState["difficulty"]) => void;
}

export function InterviewSettings({
  persona,
  setPersona,
  voice,
  setVoice,
  difficulty,
  setDifficulty,
}: InterviewSettingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
      className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 lg:p-10 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-neutral-700 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-semibold">Configuration</h2>
      </div>

      <div className="space-y-6">
        {/* Persona */}
        <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Interviewer Style</span>
            {persona === "roast" && (
              <span className="flex items-center gap-1 text-[10px] text-orange-500 font-bold animate-pulse">
                <Flame className="w-3 h-3" />
                BRUTAL MODE
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "friendly", label: "Friendly", desc: "Supportive" },
              { id: "tough", label: "Tough", desc: "Direct" },
              { id: "faang", label: "FAANG", desc: "Technical" },
              { id: "roast", label: "Roast", desc: "Ruthless" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id as any)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  persona === p.id
                    ? p.id === "roast"
                      ? "bg-orange-600 text-white border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                      : "bg-white text-black border-white"
                    : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-500 text-white"
                }`}
              >
                <div className="font-medium text-sm flex items-center gap-1.5">
                  {p.id === "roast" && <Flame className="w-3.5 h-3.5" />}
                  {p.label}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    persona === p.id
                      ? "text-inherit opacity-80"
                      : "text-neutral-500"
                  }`}
                >
                  {p.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice */}
        <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            Voice
          </label>
          <div className="flex flex-wrap gap-2">
            {["Kore", "Charon", "Aoede", "Puck", "Fenrir"].map((v) => (
              <button
                key={v}
                onClick={() => setVoice(v as any)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  voice === v
                    ? "bg-white text-black border-white"
                    : "bg-transparent border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
          <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
            Difficulty
          </label>
          <div className="bg-neutral-900/80 rounded-lg p-1 flex border border-neutral-700">
            {[
              { id: "easy", label: "Easy" },
              { id: "medium", label: "Medium" },
              { id: "hard", label: "Hard" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id as any)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  difficulty === d.id
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
