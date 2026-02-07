import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";
import { motion } from "framer-motion";
import { X, AlertTriangle, CheckCircle, FileText, Eye } from "lucide-react";

type RoastResult = {
    score: number;
    roast: string;
    flaws?: string[];
    overlay_coords?: { x: number; y: number; comment: string }[];
};

export function VisualRoastModal({
    uploadedFile,
    onClose
}: {
    uploadedFile: File;
    onClose: () => void;
}) {
    const [isRoasting, setIsRoasting] = useState(false);
    const [result, setResult] = useState<RoastResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-analyze on mount since we already have the file
    useEffect(() => {
        handleRoast();
    }, []);

    const handleRoast = async () => {
        setIsRoasting(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", uploadedFile);



        try {
            const apiBaseUrl = API_BASE_URL;
            const res = await fetch(`${apiBaseUrl}/analyze-resume-visual`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Analysis failed");
            const data = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsRoasting(false);
        }
    };

    const flaws = result?.flaws || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-neutral-700 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Resume Layout Analysis</h2>
                            <p className="text-xs text-neutral-500">{uploadedFile.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg transition text-neutral-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {isRoasting ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-2 border-neutral-700 border-t-white rounded-full animate-spin mb-4" />
                            <p className="text-sm text-neutral-400">Analyzing layout...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300 text-sm">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                            <button onClick={handleRoast} className="ml-auto text-xs underline hover:text-white">Retry</button>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Score */}
                            <div className="flex items-center justify-center">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
                                        <circle cx="64" cy="64" r="56" stroke="#262626" strokeWidth="8" fill="none" />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke={result.score >= 7 ? "#fff" : result.score >= 4 ? "#737373" : "#525252"}
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={351}
                                            strokeDashoffset={351 - (351 * (result.score || 0)) / 10}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="text-center">
                                        <span className="text-2xl font-bold text-white">{result.score || 0}</span>
                                        <span className="text-xs text-neutral-500 block">/10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Verdict */}
                            <div className="bg-neutral-800/50 border border-neutral-700 p-4 rounded-xl text-center">
                                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Assessment</h3>
                                <p className="text-sm text-white leading-relaxed">{result.roast || "No assessment available."}</p>
                            </div>

                            {/* Flaws */}
                            <div>
                                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Issues Identified</h3>
                                <div className="space-y-1.5">
                                    {flaws.length > 0 ? (
                                        flaws.map((flaw, i) => (
                                            <div key={i} className="flex items-start gap-2.5 p-2.5 bg-neutral-800/50 border border-neutral-800 rounded-lg">
                                                <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                                                    <span className="text-[10px] text-neutral-400">{i + 1}</span>
                                                </div>
                                                <span className="text-xs text-neutral-300">{flaw}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2.5 p-2.5 bg-neutral-800/30 border border-neutral-800 rounded-lg">
                                            <CheckCircle className="w-3.5 h-3.5 text-neutral-400" />
                                            <span className="text-xs text-neutral-400">No significant issues detected.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 text-neutral-500 hover:text-white border border-neutral-800 hover:bg-neutral-800 rounded-xl transition-all text-sm"
                            >
                                Close
                            </button>
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
}
