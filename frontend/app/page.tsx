"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  BarChart,
  Activity,
  Award,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ArrowLeft,
  MessageSquare,
  FileText,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  User,
  Bot,
  Clock,
  ChevronRight,
  Upload,
  CheckCircle,
  Briefcase,
  Settings,
  GraduationCap,
  Github,
  Shield,
  Cpu,
  Users,
  Sparkles
} from "lucide-react";
import { useGeminiLive, GeminiTurn } from "@/hooks/useGeminiLive";
import { FeedbackDashboard } from "@/components/FeedbackDashboard";
import {
  ParsedResume,
  InterviewAnalysisReport,
  SpeechAnalysis,
  ContentAnalysis,
  QuestionFeedback
} from "@/types";
import { useShadowObserver } from "@/hooks/useShadowObserver";
import { ShadowToast } from "@/components/ShadowToast";
import Link from "next/link";

// ==================== TYPES ====================
type ChatMessage = {
  role: "user" | "interviewer";
  content: string;
  timestamp?: number;
};

type InterviewState = {
  role: string;
  resumeText: string;
  fileName: string;
  persona: "tough" | "friendly" | "faang";
  voice: "Puck" | "Charon" | "Kore" | "Aoede" | "Fenrir";
  difficulty: "easy" | "medium" | "hard";
};

// ==================== HELPER: Parse Resume Text ====================
function parseResumeText(text: string): ParsedResume {
  const lines = text.split("\n").filter((line) => line.trim());
  const skills: string[] = [];
  const experience: string[] = [];
  const education: string[] = [];
  let summary = "";

  // Simple heuristic parsing with expanded keywords
  let currentSection = "";

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();

    // Detect section headers (more keywords)
    if (
      lowerLine.includes("skill") ||
      lowerLine.includes("technologies") ||
      lowerLine.includes("tools") ||
      lowerLine.includes("technical") ||
      lowerLine.includes("competencies") ||
      lowerLine.includes("proficiencies")
    ) {
      currentSection = "skills";
      continue;
    } else if (
      lowerLine.includes("experience") ||
      lowerLine.includes("work history") ||
      lowerLine.includes("employment") ||
      lowerLine.includes("project") ||
      lowerLine.includes("professional")
    ) {
      currentSection = "experience";
      continue;
    } else if (
      lowerLine.includes("education") ||
      lowerLine.includes("academic") ||
      lowerLine.includes("degree") ||
      lowerLine.includes("university") ||
      lowerLine.includes("college") ||
      lowerLine.includes("certification") ||
      lowerLine.includes("course")
    ) {
      currentSection = "education";
      continue;
    } else if (
      lowerLine.includes("summary") ||
      lowerLine.includes("objective") ||
      lowerLine.includes("profile") ||
      lowerLine.includes("about")
    ) {
      currentSection = "summary";
      continue;
    }

    // Extract skills (comma or pipe separated, or bullet points)
    if (currentSection === "skills") {
      const skillMatches = line
        .split(/[,|•·\-]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 35);
      skills.push(...skillMatches);
    } else if (currentSection === "experience" && line.trim().length > 10) {
      experience.push(line.trim());
    } else if (currentSection === "education" && line.trim().length > 10) {
      education.push(line.trim());
    } else if (currentSection === "summary") {
      summary += line + " ";
    }
  }

  // If no skills found, try to extract common tech keywords from the full text
  if (skills.length === 0) {
    const techKeywords = [
      "Python",
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "SQL",
      "AWS",
      "Docker",
      "Git",
      "Java",
      "C++",
      "Go",
      "Kubernetes",
      "MongoDB",
      "PostgreSQL",
      "REST",
      "GraphQL",
      "CI/CD",
      "Agile",
      "Scrum",
      "Flask",
      "Django",
      "FastAPI",
      "Next.js",
      "Vue",
      "Angular",
      "Machine Learning",
      "AI",
      "TensorFlow",
      "PyTorch",
      "HTML",
      "CSS",
      "Linux",
      "Azure",
      "GCP",
      "Redis",
      "Kafka",
      "Microservices",
    ];
    for (const keyword of techKeywords) {
      if (
        text.includes(keyword) ||
        text.toLowerCase().includes(keyword.toLowerCase())
      ) {
        skills.push(keyword);
      }
    }
  }

  // If no experience found, extract lines that look like job entries
  if (experience.length === 0) {
    for (const line of lines) {
      if (
        (line.includes("20") && line.length > 20) || // Contains year like 2020, 2021, etc.
        line.includes("•") ||
        (line.includes("-") && line.length > 30)
      ) {
        experience.push(line.trim());
        if (experience.length >= 5) break;
      }
    }
  }

  return {
    skills: skills.slice(0, 15),
    experience: experience.slice(0, 5),
    education: education.slice(0, 3),
    summary: summary.trim().slice(0, 300),
  };
}

// ==================== LANDING PAGE ====================
function LandingPage({ onStart }: { onStart: (data: InterviewState) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  // Customization State
  const [persona, setPersona] = useState<InterviewState["persona"]>("friendly");
  const [voice, setVoice] = useState<InterviewState["voice"]>("Kore");
  const [difficulty, setDifficulty] =
    useState<InterviewState["difficulty"]>("medium");


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("role", role || "Software Engineer");

      try {
        const res = await fetch("http://localhost:8000/upload-resume", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.status === "success") {
          setResumeText(data.extracted_text);
          setParsedResume(parseResumeText(data.extracted_text));
        }
      } catch {
        // Silent fail for preview
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !role.trim()) {
      setError("Please provide both a resume and target role.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);

    try {
      const res = await fetch("http://localhost:8000/upload-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      if (data.status === "success") {
        onStart({
          role: data.target_role || role,
          resumeText: data.extracted_text,
          fileName: file.name,
          persona,
          voice,
          difficulty,
        });
      } else {
        throw new Error(data.message || "Processing failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white/20 flex flex-col">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Left: Logo */}
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-black" />
              </div>
              <span className="font-semibold text-lg tracking-tight">Shadow Instructor</span>
            </a>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              <a href="/" className="px-3 py-1.5 text-sm text-white bg-neutral-800 rounded-md">
                Interview
              </a>
              <a href="/resume-analyzer" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                Resume Analyzer
              </a>
              <a href="#" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                Leaderboard
              </a>
            </div>
          </div>

          {/* Right: Account */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aryan-dani/The_Shadow_Instructor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-neutral-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-700 hover:border-neutral-500 bg-neutral-900 hover:bg-neutral-800 transition-all text-sm">
              <User className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-300">Account</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col justify-center px-6 pt-20 pb-6">
        <div className="max-w-5xl mx-auto w-full">

          {/* Grid - Full Width, Spaced Out */}
          <div className="grid lg:grid-cols-2 gap-8">

            {/* LEFT: Context Setup */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 lg:p-10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-neutral-700 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold">Context Setup</h2>
              </div>

              <div className="space-y-8">
                {/* Role */}
                <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
                  <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Target Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Backend Engineer"
                    className="w-full bg-neutral-900/80 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder:text-neutral-600 focus:border-neutral-500 focus:bg-neutral-900 focus:ring-1 focus:ring-neutral-600 outline-none transition-all"
                  />
                </div>

                {/* Resume Upload */}
                <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
                  <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Resume</label>
                  <div
                    onClick={() => document.getElementById("file-upload")?.click()}
                    className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${file
                      ? "border-white/30 bg-white/5"
                      : "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30"
                      }`}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-sm text-neutral-400">Parsing...</span>
                      </div>
                    ) : file ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-white" />
                        <span className="text-sm text-white font-medium truncate max-w-50">{file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setParsedResume(null);
                            setResumeText("");
                          }}
                          className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-neutral-500">
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">Upload PDF Resume</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills Preview */}
                {parsedResume && !isUploading && (
                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                      <span>Extracted Skills</span>
                      <span className="text-white">{parsedResume.skills.length} found</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedResume.skills.slice(0, 5).map((skill, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300">
                          {skill}
                        </span>
                      ))}
                      {parsedResume.skills.length > 5 && (
                        <span className="px-2 py-1 rounded bg-neutral-800/50 text-xs text-neutral-500">
                          +{parsedResume.skills.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT: Configuration */}
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
                  <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Interviewer Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "friendly", label: "Friendly", desc: "Supportive" },
                      { id: "tough", label: "Tough", desc: "Direct" },
                      { id: "faang", label: "FAANG", desc: "Technical" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPersona(p.id as any)}
                        className={`p-3 rounded-lg border text-left transition-all ${persona === p.id
                          ? "bg-white text-black border-white"
                          : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-500 text-white"
                          }`}
                      >
                        <div className="font-medium text-sm">{p.label}</div>
                        <div className={`text-xs mt-0.5 ${persona === p.id ? "text-neutral-600" : "text-neutral-500"}`}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice */}
                <div className="bg-black/50 border border-neutral-800 rounded-xl p-4">
                  <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Voice</label>
                  <div className="flex flex-wrap gap-2">
                    {["Kore", "Charon", "Aoede", "Puck", "Fenrir"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVoice(v as any)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${voice === v
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
                  <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Difficulty</label>
                  <div className="bg-neutral-900/80 rounded-lg p-1 flex border border-neutral-700">
                    {[
                      { id: "easy", label: "Easy" },
                      { id: "medium", label: "Medium" },
                      { id: "hard", label: "Hard" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id as any)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${difficulty === d.id
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
          </div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mt-6"
          >
            <button
              onClick={handleSubmit}
              disabled={!file || !role || isUploading}
              className="group w-full bg-white text-black font-semibold py-5 rounded-2xl hover:bg-neutral-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-lg shadow-white/5 hover:shadow-white/10"
            >
              <span>Start Interview</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {error && (
              <div className="mt-4 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10 p-4 rounded-xl">
                {error}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto border-t border-neutral-800 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center text-neutral-500 text-sm">
          <a href="/copyright" className="flex items-center gap-2 hover:text-white transition-colors">
            <GraduationCap className="w-4 h-4" />
            <span>Shadow Instructor</span>
          </a>
          <span className="mx-3">•</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}

// ==================== INTERVIEW DASHBOARD ====================
function InterviewDashboard({
  interviewData,
  onEnd,
  onAnalyze,
}: {
  interviewData: InterviewState;
  onEnd: () => void;
  onAnalyze: (messages: ChatMessage[]) => void;
}) {
  const {
    isConnected,
    messages: geminiMessages,
    connect,
    disconnect,
    setMicMuted,
  } = useGeminiLive();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "resume">(
    "transcript",
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Adapt messages for UI - Defined early for handleEndCall
  const messages: ChatMessage[] = geminiMessages
    .map((msg: GeminiTurn) => ({
      role: (msg.role === "model" ? "interviewer" : "user") as
        | "user"
        | "interviewer",
      content: msg.text || "",
      timestamp: msg.timestamp,
    }))
    .filter((m) => m.content);

  // Connect to Gemini on mount
  useEffect(() => {
    connect({
      role: interviewData.role,
      resumeText: interviewData.resumeText,
      persona: interviewData.persona,
      voice: interviewData.voice,
      difficulty: interviewData.difficulty,
      webcamRef: videoRef,
    });
    return () => {
      disconnect();
    };
  }, []);

  // Initialize video stream
  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setIsCameraOn(false);
      }
    };
    startVideo();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Sync Mic State with Gemini Hook
  useEffect(() => {
    if (setMicMuted) {
      setMicMuted(!isMicOn);
    }
  }, [isMicOn, setMicMuted]);

  // Toggle camera
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOn;
      });

      if (isCameraOn && videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isCameraOn]);

  const handleEndCall = useCallback(() => {
    disconnect();
    if (messages.length > 0) {
      onAnalyze(messages);
    } else {
      onEnd();
    }
  }, [disconnect, onEnd, onAnalyze, messages]);

  const parsedResume = parseResumeText(interviewData.resumeText);

  // Shadow Observer
  const latestTranscript = messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";
  const { feedback } = useShadowObserver({
    isConnected,
    videoRef,
    latestTranscript
  });

  return (
    <div className="h-screen flex flex-col bg-black text-white font-sans antialiased">
      <ShadowToast feedback={feedback} />
      {/* Top Header - Matching Landing Page */}
      <header className="shrink-0 h-16 border-b border-neutral-800 bg-black/80 backdrop-blur-xl flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndCall}
            className="p-2 rounded-lg hover:bg-neutral-800 transition text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-neutral-700" />
          <div>
            <h1 className="text-sm font-medium text-white">
              Interview Session
            </h1>
            <p className="text-xs text-neutral-500">{interviewData.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-white" : "bg-neutral-500 animate-pulse"}`}
            />
            <span className="text-xs font-medium text-neutral-400">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition ${showSettings ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <Settings className="w-4 h-4" />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 z-50">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Interview Settings</h3>

                <div className="space-y-3">
                  {/* Voice */}
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1.5">AI Voice</label>
                    <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg">
                      {interviewData.voice}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1.5">Difficulty</label>
                    <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg capitalize">
                      {interviewData.difficulty}
                    </div>
                  </div>

                  {/* Persona */}
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1.5">Interviewer Style</label>
                    <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg capitalize">
                      {interviewData.persona}
                    </div>
                  </div>

                  {/* Shadow Mode Indicator */}
                  <div className="pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Shadow Mode</span>
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1">Real-time feedback on eye contact & pacing</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Panel - Video */}
        <div className="flex-1">
          <div className="h-full bg-neutral-900/80 border border-neutral-800 rounded-3xl relative overflow-hidden">
            {/* Self View Video */}
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <div className="w-24 h-24 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <User className="w-12 h-12 text-neutral-600" />
                </div>
              </div>
            )}

            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 border border-neutral-800">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-white" : "bg-neutral-500 animate-pulse"}`}
              />
              <span className="text-xs font-medium text-white">
                {isConnected ? "Live" : "Starting..."}
              </span>
            </div>

            {/* AI Interviewer Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 border border-neutral-800">
              <Bot className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-neutral-300">
                AI Interviewer
              </span>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3.5 rounded-full transition-all border ${isMicOn
                  ? "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                  }`}
              >
                {isMicOn ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`p-3.5 rounded-full transition-all border ${isCameraOn
                  ? "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                  : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                  }`}
              >
                {isCameraOn ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="p-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all border border-red-500"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Transcript/Resume */}
        <div className="w-96 shrink-0">
          <div className="h-full bg-neutral-900/80 border border-neutral-800 rounded-3xl flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="shrink-0 flex border-b border-neutral-800">
              <button
                onClick={() => setActiveTab("transcript")}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${activeTab === "transcript"
                  ? "text-white border-b-2 border-white"
                  : "text-neutral-500 hover:text-neutral-300"
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                Transcript
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${activeTab === "resume"
                  ? "text-white border-b-2 border-white"
                  : "text-neutral-500 hover:text-neutral-300"
                  }`}
              >
                <FileText className="w-4 h-4" />
                Resume
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === "transcript" ? (
                  <TranscriptPanel
                    key="transcript"
                    messages={messages}
                    isConnected={isConnected}
                  />
                ) : (
                  <ResumePanelParsed
                    key="resume"
                    parsedResume={parsedResume}
                    fileName={interviewData.fileName}
                    rawText={interviewData.resumeText}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== TRANSCRIPT PANEL ====================
function TranscriptPanel({
  messages,
  isConnected,
}: {
  messages: ChatMessage[];
  isConnected: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-neutral-500" />
            </div>
            <h3 className="text-sm font-medium text-neutral-300 mb-1">
              {isConnected ? "Listening..." : "Connecting..."}
            </h3>
            <p className="text-xs text-neutral-500 max-w-48">
              {isConnected
                ? "Start speaking to begin the interview."
                : "Establishing connection..."}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-xl border ${msg.role === "interviewer"
                ? "bg-neutral-800/50 border-neutral-700"
                : "bg-black/50 border-neutral-800"
                }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${msg.role === "interviewer"
                    ? "bg-white/10 border-neutral-600"
                    : "bg-neutral-800 border-neutral-700"
                    }`}
                >
                  {msg.role === "interviewer" ? (
                    <Bot className="w-3 h-3 text-white" />
                  ) : (
                    <User className="w-3 h-3 text-neutral-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-neutral-400">
                      {msg.role === "interviewer" ? "Interviewer" : "You"}
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-neutral-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-200 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Listening Indicator */}
      {isConnected && (
        <div className="shrink-0 p-3 border-t border-neutral-800">
          <div className="flex items-center gap-2 text-neutral-500">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-3 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs">Listening...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==================== RESUME PANEL (PARSED) ====================
function ResumePanelParsed({
  parsedResume,
  fileName,
  rawText,
}: {
  parsedResume: ParsedResume;
  fileName: string;
  rawText: string;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-neutral-700 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">{fileName}</h3>
              <p className="text-xs text-neutral-500">
                {rawText.length.toLocaleString()} characters
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-neutral-500 hover:text-white transition px-2 py-1 rounded hover:bg-neutral-800"
          >
            {showRaw ? "Parsed View" : "Raw Text"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showRaw ? (
          <div className="text-xs text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed bg-black/50 p-3 rounded-xl border border-neutral-800">{rawText}</div>
        ) : (
          <div className="space-y-3">
            {/* Skills */}
            {parsedResume.skills.length > 0 && (
              <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {parsedResume.skills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs text-neutral-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {parsedResume.experience.length > 0 && (
              <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Experience</div>
                <ul className="text-xs text-neutral-400 space-y-1.5">
                  {parsedResume.experience.map((exp, i) => (
                    <li key={i} className="leading-relaxed">
                      • {exp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Education */}
            {parsedResume.education.length > 0 && (
              <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Education</div>
                <ul className="text-xs text-neutral-400 space-y-1.5">
                  {parsedResume.education.map((edu, i) => (
                    <li key={i} className="leading-relaxed">
                      • {edu}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {parsedResume.summary && (
              <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Summary</div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {parsedResume.summary}
                </p>
              </div>
            )}

            {/* Fallback if nothing parsed */}
            {parsedResume.skills.length === 0 &&
              parsedResume.experience.length === 0 &&
              parsedResume.education.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-500 mb-2">
                    Could not parse structured data
                  </p>
                  <button
                    onClick={() => setShowRaw(true)}
                    className="text-xs text-white hover:underline"
                  >
                    View raw text instead
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== MAIN APP ====================
export default function Home() {
  const [interviewData, setInterviewData] = useState<InterviewState | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InterviewAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load state on mount
  useEffect(() => {
    setIsClient(true);
    const savedData = sessionStorage.getItem("interviewData");
    const savedReport = sessionStorage.getItem("analysisReport");

    if (savedData) {
      try {
        setInterviewData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved interview data", e);
      }
    }

    if (savedReport) {
      try {
        setAnalysisResult(JSON.parse(savedReport));
      } catch (e) {
        console.error("Failed to parse saved report", e);
      }
    }
  }, []);

  // Save state on change
  useEffect(() => {
    if (interviewData) {
      sessionStorage.setItem("interviewData", JSON.stringify(interviewData));
    } else {
      sessionStorage.removeItem("interviewData");
    }
  }, [interviewData]);

  useEffect(() => {
    if (analysisResult) {
      sessionStorage.setItem("analysisReport", JSON.stringify(analysisResult));
    } else {
      sessionStorage.removeItem("analysisReport");
    }
  }, [analysisResult]);


  const handleAnalyze = async (messages: ChatMessage[]) => {
    // BUG FIX: Provide minimal feedback if not enough messages
    if (!messages || messages.length < 2) {
      console.warn("Interview too short for analysis");
      setInterviewData(null); // Or show a toast
      return;
    }

    setConversationHistory(messages);
    setIsAnalyzing(true);

    try {
      const res = await fetch("http://localhost:8000/analyze-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: interviewData?.role || "Software Engineer",
          history: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        })
      });

      if (!res.ok) {
        // Handle non-200 responses gracefully
        const errText = await res.text();
        console.error("Analysis failed:", errText);
        throw new Error("Analysis failed");
      }

      const data: InterviewAnalysisReport = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error("Analysis failed:", err);
      // Fallback: Just return to home for now, but in future could show error toast
      setInterviewData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartNew = () => {
    setInterviewData(null);
    setAnalysisResult(null);
    setConversationHistory([]);
    sessionStorage.clear();
  };

  if (!isClient) return null; // Prevent hydration mismatch

  // Render Loading State
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full border-4 border-neutral-800 border-t-white animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold mb-2">Analyzing Your Interview</h2>
          <p className="text-neutral-500 text-sm">Generating your professional report...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {analysisResult ? (
        <motion.div
          key="feedback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FeedbackDashboard
            report={analysisResult}
            role={interviewData?.role || "Interview"}
            onStartNew={handleStartNew}
          />
        </motion.div>
      ) : !interviewData ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <LandingPage onStart={setInterviewData} />
        </motion.div>
      ) : (
        <motion.div
          key="interview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-screen"
        >
          <InterviewDashboard
            interviewData={interviewData}
            onEnd={() => setInterviewData(null)}
            onAnalyze={handleAnalyze}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
