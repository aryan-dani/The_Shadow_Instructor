import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";

interface ResumeUploaderProps {
  onComplete: (role: string, resumeText: string) => void;
}

export default function ResumeUploader({ onComplete }: ResumeUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !role.trim()) {
      setError("Please provide both a resume and a target role.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBaseUrl}/upload-resume`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed. Please try again.");

      const data = await res.json();
      if (data.status === "success") {
        // Pass both role and extracted text
        onComplete(data.target_role || role, data.extracted_text);
      } else {
        throw new Error(data.message || "Parsing failed.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">
          Initialize Interview Protocol
        </h2>
        <p className="text-gray-400">
          Upload your credentials to calibrate the AI Interviewer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Briefcase size={16} className="text-blue-400" />
            Target Role / Position
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer, System Architect..."
            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          />
        </div>

        {/* File Upload */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group ${file ? "border-green-500/50 bg-green-500/5" : "border-white/10 hover:border-blue-400/50 hover:bg-blue-400/5"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-3">
                <CheckCircle size={24} />
              </div>
              <span className="text-sm font-medium text-gray-200">
                {file.name}
              </span>
              <span className="text-xs text-green-400 mt-1">
                Ready to upload
              </span>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center text-gray-400 group-hover:text-gray-300">
              <Upload
                size={32}
                className="mb-3 opacity-50 group-hover:scale-110 transition-transform"
              />
              <span className="text-sm font-medium">
                Click to upload Resume (PDF/TXT)
              </span>
              <span className="text-xs opacity-50 mt-1">Maximum size 5MB</span>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || !file || !role}
          className={`w-full py-4 rounded-lg font-medium text-sm tracking-wide transition-all ${isUploading || !file || !role ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"}`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              ANALYZING PROFILE...
            </span>
          ) : (
            "START INTERVIEW SESSION"
          )}
        </button>
      </form>
    </div>
  );
}
