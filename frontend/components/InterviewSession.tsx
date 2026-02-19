import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Settings, MessageSquare, FileText } from "lucide-react";
import { useGeminiLive, GeminiTurn } from "@/hooks/useGeminiLive";
import { useShadowObserver } from "@/hooks/useShadowObserver";
import { ShadowToast } from "@/components/ShadowToast";
import { VideoFeed } from "@/components/VideoFeed";
import { InterviewState, ChatMessage, ParsedResume } from "@/types";
import { parseResumeText } from "@/utils/resumeParser";

// Re-using local components from original page.tsx implies they should be exported or defined here
// Since TranscriptPanel and ResumePanelParsed were in page.tsx, I should probably move them to their own files or define them here.
// For brevity, I will include them here or ask to move them.
// I will include them here to ensure it works.

// ==================== TRANSCRIPT PANEL (Moved from page.tsx) ====================
import { Bot, User } from "lucide-react";

function TranscriptPanel({
    messages,
    isConnected,
}: {
    messages: ChatMessage[];
    isConnected: boolean;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
        >
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
            >
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
                    <div className="text-xs text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed bg-black/50 p-3 rounded-xl border border-neutral-800">
                        {rawText}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Skills */}
                        {parsedResume.skills.length > 0 && (
                            <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Skills
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {parsedResume.skills.map((skill, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-xs text-neutral-300"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Experience */}
                        {parsedResume.experience.length > 0 && (
                            <div className="bg-black/50 border border-neutral-800 rounded-xl p-3">
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Experience
                                </div>
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
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Education
                                </div>
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
                                <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                                    Summary
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed">
                                    {parsedResume.summary}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}


interface InterviewSessionProps {
    interviewData: InterviewState;
    onEnd: () => void;
    onAnalyze: (messages: ChatMessage[]) => void;
}

export function InterviewSession({
    interviewData,
    onEnd,
    onAnalyze,
}: InterviewSessionProps) {
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
    const [activeTab, setActiveTab] = useState<"transcript" | "resume">("transcript");

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Adapt messages for UI
    const messages: ChatMessage[] = geminiMessages
        .map((msg: GeminiTurn) => ({
            role: (msg.role === "model" ? "interviewer" : "user") as "user" | "interviewer",
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

    // Sync Mic State
    useEffect(() => {
        if (setMicMuted) {
            setMicMuted(!isMicOn);
        }
    }, [isMicOn, setMicMuted]);

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
    const latestTranscript =
        messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const { feedback } = useShadowObserver({
        isConnected,
        videoRef,
        latestTranscript,
        persona: interviewData.persona,
    });

    return (
        <div className="h-screen flex flex-col bg-black text-white font-sans antialiased">
            <ShadowToast feedback={feedback} />

            {/* Top Header */}
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
                        <h1 className="text-sm font-medium text-white">Interview Session</h1>
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
                            className={`p-2 rounded-lg transition ${showSettings ? "bg-neutral-800 text-white" : "hover:bg-neutral-800 text-neutral-400 hover:text-white"}`}
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        {showSettings && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 z-50">
                                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                                    Interview Settings
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-neutral-500 block mb-1.5">AI Voice</label>
                                        <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg">
                                            {interviewData.voice}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-500 block mb-1.5">Difficulty</label>
                                        <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg capitalize">
                                            {interviewData.difficulty}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-500 block mb-1.5">Interviewer Style</label>
                                        <div className="text-sm text-white bg-neutral-800 px-3 py-2 rounded-lg capitalize">
                                            {interviewData.persona}
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-neutral-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-neutral-500">Shadow Mode</span>
                                            <span className="text-xs text-green-400 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                                Active
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-neutral-600 mt-1">
                                            Real-time feedback on eye contact & pacing
                                        </p>
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
                    <VideoFeed
                        videoRef={videoRef}
                        streamRef={streamRef}
                        isMicOn={isMicOn}
                        setIsMicOn={setIsMicOn}
                        isCameraOn={isCameraOn}
                        setIsCameraOn={setIsCameraOn}
                        onEndCall={handleEndCall}
                        isConnected={isConnected}
                    />
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
