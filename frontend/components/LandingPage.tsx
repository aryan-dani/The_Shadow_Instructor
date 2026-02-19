import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InterviewSettings } from "@/components/InterviewSettings";
import { ResumeUpload } from "@/components/ResumeUpload";
import { InterviewState, ParsedResume } from "@/types";

interface LandingPageProps {
    onStart: (data: InterviewState) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
    const [role, setRole] = useState("");
    const [resumeText, setResumeText] = useState("");
    const [fileName, setFileName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Customization State
    const [persona, setPersona] = useState<InterviewState["persona"]>("friendly");
    const [voice, setVoice] = useState<InterviewState["voice"]>("Kore");
    const [difficulty, setDifficulty] = useState<InterviewState["difficulty"]>("medium");

    const [hasFile, setHasFile] = useState(false);

    const handleFileSelect = (file: File | null) => {
        setHasFile(!!file);
        if (file) setFileName(file.name);
    };

    const handleParseComplete = (parsed: ParsedResume | null, text: string) => {
        setResumeText(text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasFile || !role.trim()) {
            setError("Please provide both a resume and target role.");
            return;
        }

        onStart({
            role: role,
            resumeText: resumeText,
            fileName: fileName,
            persona,
            voice,
            difficulty,
        });
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white/20 flex flex-col">
            {/* ===== NAVBAR ===== */}
            <Navbar />

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 flex flex-col justify-center px-6 pt-20 pb-6">
                <div className="max-w-5xl mx-auto w-full">
                    {/* Grid - Full Width, Spaced Out */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* LEFT: Context Setup */}
                        <ResumeUpload
                            role={role}
                            setRole={setRole}
                            onFileSelect={handleFileSelect}
                            onParseComplete={handleParseComplete}
                            isUploading={isUploading}
                            setIsUploading={setIsUploading}
                            setError={setError}
                        />

                        {/* RIGHT: Configuration */}
                        <InterviewSettings
                            persona={persona}
                            setPersona={setPersona}
                            voice={voice}
                            setVoice={setVoice}
                            difficulty={difficulty}
                            setDifficulty={setDifficulty}
                        />
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
                            disabled={!hasFile || !role || isUploading}
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
            <Footer />
        </div>
    );
}
