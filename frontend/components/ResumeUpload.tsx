import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "@/utils/api";
import { parseResumeText } from "@/utils/resumeParser";
import { ParsedResume } from "@/types";

interface ResumeUploadProps {
    role: string;
    setRole: (role: string) => void;
    onFileSelect: (file: File | null) => void;
    onParseComplete: (parsed: ParsedResume | null, text: string) => void;
    isUploading: boolean;
    setIsUploading: (isUploading: boolean) => void;
    setError: (error: string | null) => void;
}

export function ResumeUpload({
    role,
    setRole,
    onFileSelect,
    onParseComplete,
    isUploading,
    setIsUploading,
    setError,
}: ResumeUploadProps) {
    const [file, setFileInternal] = useState<File | null>(null);
    const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFileInternal(selectedFile);
            onFileSelect(selectedFile);
            setError(null);

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("role", role || "Software Engineer");

            setIsUploading(true);
            try {
                const apiBaseUrl = API_BASE_URL;
                const res = await fetch(`${apiBaseUrl}/upload-resume`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();

                if (data.status === "success") {
                    const parsed = parseResumeText(data.extracted_text);
                    setParsedResume(parsed);
                    onParseComplete(parsed, data.extracted_text);

                    // Auto-fill role if not set and backend suggests one (though backend returns passed role usually)
                    if (!role && data.target_role) {
                        setRole(data.target_role);
                    }
                } else {
                    setError(data.message || "Failed to parse resume");
                }
            } catch (err: any) {
                // Silent fail for preview or set error
                console.error("Upload error", err);
                setError("Failed to upload resume. Please check connection.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFileInternal(null);
        setParsedResume(null);
        onFileSelect(null);
        onParseComplete(null, "");
    };

    return (
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
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Target Role
                    </label>
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
                    <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">
                        Resume
                    </label>
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
                                <span className="text-sm text-white font-medium truncate max-w-50">
                                    {file.name}
                                </span>
                                <button
                                    onClick={removeFile}
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
                                <span
                                    key={i}
                                    className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300"
                                >
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
    );
}
