"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Sparkles,
  User,
  Bot,
  Clock,
  Zap,
  Shield,
  Target,
  ChevronRight,
  Upload,
  CheckCircle,
  Briefcase,
  Settings,
  Volume2,
} from "lucide-react";
import { useGeminiLive, GeminiTurn } from "@/hooks/useGeminiLive";

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
};

// ==================== LANDING PAGE ====================
function LandingPage({ onStart }: { onStart: (data: InterviewState) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);

      // Auto-upload for preview
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
    <div className="min-h-screen gradient-mesh">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              Shadow Instructor
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              How it Works
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-400 font-medium">
                  AI-Powered Interview Practice
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Master Your Next
                <span className="text-gradient block">Technical Interview</span>
              </h1>

              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Practice with an AI interviewer that adapts to your resume and
                target role. Get real-time voice conversations and instant
                feedback to improve your skills.
              </p>

              <div className="flex flex-wrap gap-6 mb-10">
                <div className="flex items-center gap-2 text-gray-300">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Private & Secure</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm">Role-Specific</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Volume2 className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm">Voice Enabled</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Upload Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <form onSubmit={handleSubmit} className="card-elevated p-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Start Your Session
                </h2>
                <p className="text-gray-400 text-sm mb-8">
                  Upload your resume to begin practicing
                </p>

                {/* Role Input */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    Target Position
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Software Engineer, Data Scientist..."
                    className="input-field"
                  />
                </div>

                {/* File Upload */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Resume
                  </label>
                  <label
                    className={`block p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      file
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center text-center">
                      {file ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {file.name}
                          </span>
                          <span className="text-xs text-green-400 mt-1">
                            Ready to analyze
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
                            <Upload className="w-5 h-5 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-400">
                            Drop your resume here or{" "}
                            <span className="text-indigo-400">browse</span>
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            PDF or TXT, max 5MB
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Resume Preview */}
                {resumeText && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-6"
                  >
                    <div className="text-xs text-gray-500 mb-2">
                      Resume Preview
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 max-h-32 overflow-auto">
                      <p className="text-xs text-gray-400 whitespace-pre-wrap line-clamp-6">
                        {resumeText.substring(0, 500)}...
                      </p>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUploading || !file || !role}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      Start Interview
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Shadow Instructor?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our AI interviewer provides a realistic practice environment to
              help you succeed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Mic className="w-6 h-6" />,
                title: "Voice-First Experience",
                description:
                  "Natural voice conversations just like a real interview. Speak naturally and get instant responses.",
                color: "indigo",
              },
              {
                icon: <FileText className="w-6 h-6" />,
                title: "Resume-Aware Questions",
                description:
                  "Questions tailored to your experience and the specific role you're targeting.",
                color: "cyan",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Practice Anytime",
                description:
                  "No scheduling needed. Practice whenever you're ready, as many times as you want.",
                color: "pink",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="card p-6"
              >
                <div
                  className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                    feature.color === "indigo"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : feature.color === "cyan"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-pink-500/20 text-pink-400"
                  }`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ==================== INTERVIEW DASHBOARD ====================
function InterviewDashboard({
  interviewData,
  onEnd,
}: {
  interviewData: InterviewState;
  onEnd: () => void;
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
  const [activeTab, setActiveTab] = useState<"transcript" | "resume">(
    "transcript",
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Connect to Gemini on mount
  useEffect(() => {
    connect(interviewData.role, interviewData.resumeText);
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
      // Toggle tracks
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOn;
      });

      // Ensure video element has stream attached (important when toggling back on)
      if (isCameraOn && videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isCameraOn]);

  const handleEndCall = useCallback(() => {
    disconnect();
    onEnd();
  }, [disconnect, onEnd]);

  // Adapt messages for UI
  const messages: ChatMessage[] = geminiMessages
    .map((msg: GeminiTurn) => ({
      role: (msg.role === "model" ? "interviewer" : "user") as
        | "user"
        | "interviewer",
      content: msg.text || "",
      timestamp: msg.timestamp,
    }))
    .filter((m) => m.content);

  return (
    <div className="h-screen flex flex-col bg-bg-dark">
      {/* Top Header */}
      <header className="shrink-0 h-16 glass-strong flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndCall}
            className="p-2 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <div>
            <h1 className="text-sm font-semibold text-white">
              Interview Session
            </h1>
            <p className="text-xs text-gray-500">{interviewData.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <div
              className={`status-dot ${isConnected ? "status-connected" : "status-connecting"}`}
            />
            <span className="text-xs font-medium text-gray-300">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Video */}
        <div className="flex-1 p-4">
          <div className="h-full video-container relative">
            {/* Self View Video */}
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-linear-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-600" />
                </div>
              </div>
            )}

            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 glass px-3 py-1.5 rounded-full z-10">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}
              />
              <span className="text-xs font-medium text-white">
                {isConnected ? "Live" : "Starting..."}
              </span>
            </div>

            {/* AI Interviewer Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 glass px-3 py-1.5 rounded-full z-10">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-gray-300">
                AI Interviewer
              </span>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-4 rounded-full transition-all ${
                  isMicOn
                    ? "bg-gray-800 hover:bg-gray-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
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
                className={`p-4 rounded-full transition-all ${
                  isCameraOn
                    ? "bg-gray-800 hover:bg-gray-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
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
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Transcript/Resume */}
        <div className="w-105 shrink-0 p-4 pl-0">
          <div className="h-full card-elevated flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="shrink-0 flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab("transcript")}
                className={`tab-button flex items-center gap-2 ${activeTab === "transcript" ? "active" : ""}`}
              >
                <MessageSquare className="w-4 h-4" />
                Transcript
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`tab-button flex items-center gap-2 ${activeTab === "resume" ? "active" : ""}`}
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
                  <ResumePanel
                    key="resume"
                    resumeText={interviewData.resumeText}
                    fileName={interviewData.fileName}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              {isConnected ? "Listening..." : "Connecting..."}
            </h3>
            <p className="text-xs text-gray-500 max-w-50">
              {isConnected
                ? "Start speaking to begin. The interviewer will respond."
                : "Establishing connection to the AI interviewer..."}
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-xl ${
                msg.role === "interviewer"
                  ? "message-interviewer"
                  : "message-user"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "interviewer"
                      ? "bg-indigo-500/20"
                      : "bg-cyan-500/20"
                  }`}
                >
                  {msg.role === "interviewer" ? (
                    <Bot className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <User className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-300">
                      {msg.role === "interviewer" ? "Interviewer" : "You"}
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Speaking Indicator */}
      {isConnected && (
        <div className="shrink-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-indigo-500 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs">Listening for speech...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ==================== RESUME PANEL ====================
function ResumePanel({
  resumeText,
  fileName,
}: {
  resumeText: string;
  fileName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{fileName}</h3>
            <p className="text-xs text-gray-500">
              {resumeText.length.toLocaleString()} characters
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="resume-content">{resumeText}</div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN APP ====================
export default function Home() {
  const [interviewData, setInterviewData] = useState<InterviewState | null>(
    null,
  );

  return (
    <AnimatePresence mode="wait">
      {!interviewData ? (
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
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
