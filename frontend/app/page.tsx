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

type ParsedResume = {
  skills: string[];
  experience: string[];
  education: string[];
  summary: string;
};

// ==================== HELPER: Parse Resume Text ====================
function parseResumeText(text: string): ParsedResume {
  const lines = text.split("\n").filter((line) => line.trim());
  const skills: string[] = [];
  const experience: string[] = [];
  const education: string[] = [];
  let summary = "";

  // Simple heuristic parsing
  let currentSection = "";

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (
      lowerLine.includes("skill") ||
      lowerLine.includes("technologies") ||
      lowerLine.includes("tools")
    ) {
      currentSection = "skills";
      continue;
    } else if (
      lowerLine.includes("experience") ||
      lowerLine.includes("work history") ||
      lowerLine.includes("employment")
    ) {
      currentSection = "experience";
      continue;
    } else if (
      lowerLine.includes("education") ||
      lowerLine.includes("academic") ||
      lowerLine.includes("degree")
    ) {
      currentSection = "education";
      continue;
    } else if (
      lowerLine.includes("summary") ||
      lowerLine.includes("objective") ||
      lowerLine.includes("profile")
    ) {
      currentSection = "summary";
      continue;
    }

    // Extract skills (comma or pipe separated, or bullet points)
    if (currentSection === "skills") {
      const skillMatches = line
        .split(/[,|•·]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 30);
      skills.push(...skillMatches);
    } else if (currentSection === "experience" && line.trim().length > 10) {
      experience.push(line.trim());
    } else if (currentSection === "education" && line.trim().length > 10) {
      education.push(line.trim());
    } else if (currentSection === "summary") {
      summary += line + " ";
    }
  }

  // If no skills found, try to extract common tech keywords
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
    ];
    for (const keyword of techKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        skills.push(keyword);
      }
    }
  }

  return {
    skills: skills.slice(0, 12),
    experience: experience.slice(0, 3),
    education: education.slice(0, 2),
    summary: summary.trim().slice(0, 200),
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="navbar-pill px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">
              Shadow Instructor
            </span>
          </div>
          <a
            href="https://github.com/aryan-dani/The_Shadow_Instructor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left - Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">
                  AI-Powered Interview Practice
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                Practice Technical Interviews with{" "}
                <span className="text-accent">AI Precision</span>
              </h1>

              <p className="text-base text-slate-400 mb-8 leading-relaxed max-w-lg">
                Upload your resume, specify your target role, and engage in
                realistic voice conversations with an AI interviewer tailored
                to your experience.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-slate-400">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm">Private & Secure</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Role-Specific Questions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mic className="w-4 h-4 text-sky-400" />
                  <span className="text-sm">Voice-First Experience</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Upload Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <form onSubmit={handleSubmit} className="card-elevated p-6">
                <h2 className="text-lg font-semibold text-white mb-1">
                  Start Your Session
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Upload your resume to begin
                </p>

                {/* Role Input */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    Target Position
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Software Engineer, Data Scientist"
                    className="input-field"
                  />
                </div>

                {/* File Upload */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Resume
                  </label>
                  <label
                    className={`block p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${file
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-slate-600 hover:border-blue-500/50 hover:bg-blue-500/5"
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
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {file.name}
                          </span>
                          <span className="text-xs text-emerald-400 mt-1">
                            Ready to analyze
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center mb-2">
                            <Upload className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="text-sm text-slate-400">
                            Drop your resume or{" "}
                            <span className="text-blue-400">browse</span>
                          </span>
                          <span className="text-xs text-slate-600 mt-1">
                            PDF or TXT, max 5MB
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Parsed Resume Preview */}
                {parsedResume && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4"
                  >
                    <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                      Extracted Information
                    </div>
                    <div className="space-y-3">
                      {/* Skills */}
                      {parsedResume.skills.length > 0 && (
                        <div className="resume-section-card">
                          <div className="resume-section-title">Skills</div>
                          <div className="flex flex-wrap gap-1">
                            {parsedResume.skills.map((skill, i) => (
                              <span key={i} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {parsedResume.experience.length > 0 && (
                        <div className="resume-section-card">
                          <div className="resume-section-title">Experience</div>
                          <ul className="text-xs text-slate-400 space-y-1">
                            {parsedResume.experience.map((exp, i) => (
                              <li key={i} className="truncate">
                                • {exp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Education */}
                      {parsedResume.education.length > 0 && (
                        <div className="resume-section-card">
                          <div className="resume-section-title">Education</div>
                          <ul className="text-xs text-slate-400 space-y-1">
                            {parsedResume.education.map((edu, i) => (
                              <li key={i} className="truncate">
                                • {edu}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
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
      <section id="features" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-3">
              Why Shadow Instructor?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              A realistic practice environment designed to help you succeed in
              technical interviews.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Mic className="w-5 h-5" />,
                title: "Voice-First Experience",
                description:
                  "Natural voice conversations with sub-second latency, just like a real interview.",
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: "Resume-Aware Questions",
                description:
                  "Questions tailored to your experience and the specific role you're targeting.",
              },
              {
                icon: <Clock className="w-5 h-5" />,
                title: "Practice Anytime",
                description:
                  "No scheduling needed. Practice whenever you're ready, as many times as you want.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="feature-card"
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how" className="py-16 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload Resume",
                description:
                  "Upload your PDF resume. Our system extracts key information to personalize your session.",
              },
              {
                step: "02",
                title: "Specify Role",
                description:
                  "Enter your target position. The AI interviewer adapts questions accordingly.",
              },
              {
                step: "03",
                title: "Practice",
                description:
                  "Engage in a voice conversation. Get real-time responses and improve your skills.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                  <span className="text-blue-400 font-semibold text-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-500">Shadow Instructor</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aryan-dani/The_Shadow_Instructor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 transition"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
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

  const parsedResume = parseResumeText(interviewData.resumeText);

  return (
    <div className="h-screen flex flex-col bg-bg-dark">
      {/* Top Header */}
      <header className="shrink-0 h-14 glass-strong flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleEndCall}
            className="p-2 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <h1 className="text-sm font-medium text-white">
              Interview Session
            </h1>
            <p className="text-xs text-slate-500">{interviewData.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
            <div
              className={`status-dot ${isConnected ? "status-connected" : "status-connecting"}`}
            />
            <span className="text-xs font-medium text-slate-400">
              {isConnected ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-white">
            <Settings className="w-4 h-4" />
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
                className="absolute inset-0 w-full h-full object-cover rounded-xl transform scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                  <User className="w-12 h-12 text-slate-600" />
                </div>
              </div>
            )}

            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full z-10 border border-slate-700">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span className="text-xs font-medium text-white">
                {isConnected ? "Live" : "Starting..."}
              </span>
            </div>

            {/* AI Interviewer Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full z-10 border border-slate-700">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-slate-300">
                AI Interviewer
              </span>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3.5 rounded-full transition-all ${isMicOn
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
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
                className={`p-3.5 rounded-full transition-all ${isCameraOn
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
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
                className="p-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Transcript/Resume */}
        <div className="w-96 shrink-0 p-4 pl-0">
          <div className="h-full card-elevated flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="shrink-0 flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab("transcript")}
                className={`tab-button flex items-center gap-2 ${activeTab === "transcript" ? "active" : ""}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Transcript
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={`tab-button flex items-center gap-2 ${activeTab === "resume" ? "active" : ""}`}
              >
                <FileText className="w-3.5 h-3.5" />
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
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">
              {isConnected ? "Listening..." : "Connecting..."}
            </h3>
            <p className="text-xs text-slate-500 max-w-48">
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
              className={`p-3 rounded-lg ${msg.role === "interviewer"
                ? "message-interviewer"
                : "message-user"
                }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "interviewer"
                    ? "bg-blue-500/20"
                    : "bg-sky-500/20"
                    }`}
                >
                  {msg.role === "interviewer" ? (
                    <Bot className="w-3 h-3 text-blue-400" />
                  ) : (
                    <User className="w-3 h-3 text-sky-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-400">
                      {msg.role === "interviewer" ? "Interviewer" : "You"}
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-slate-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
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
        <div className="shrink-0 p-3 border-t border-slate-700">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"
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
      <div className="shrink-0 p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">{fileName}</h3>
              <p className="text-xs text-slate-500">
                {rawText.length.toLocaleString()} characters
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            {showRaw ? "Parsed View" : "Raw Text"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showRaw ? (
          <div className="resume-content">{rawText}</div>
        ) : (
          <div className="space-y-3">
            {/* Skills */}
            {parsedResume.skills.length > 0 && (
              <div className="resume-section-card">
                <div className="resume-section-title">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {parsedResume.skills.map((skill, i) => (
                    <span key={i} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {parsedResume.experience.length > 0 && (
              <div className="resume-section-card">
                <div className="resume-section-title">Experience</div>
                <ul className="text-xs text-slate-400 space-y-1.5">
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
              <div className="resume-section-card">
                <div className="resume-section-title">Education</div>
                <ul className="text-xs text-slate-400 space-y-1.5">
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
              <div className="resume-section-card">
                <div className="resume-section-title">Summary</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {parsedResume.summary}
                </p>
              </div>
            )}

            {/* Fallback if nothing parsed */}
            {parsedResume.skills.length === 0 &&
              parsedResume.experience.length === 0 &&
              parsedResume.education.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500 mb-2">
                    Could not parse structured data
                  </p>
                  <button
                    onClick={() => setShowRaw(true)}
                    className="text-xs text-blue-400 hover:underline"
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
