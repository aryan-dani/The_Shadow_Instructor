import {
    Activity,
    Award,
    BookOpen,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Home,
    Share2,
    Download
} from "lucide-react";
import { motion } from "framer-motion";
import { InterviewAnalysisReport } from "@/types";

// ==================== FEEDBACK DASHBOARD ====================
export function FeedbackDashboard({
    report,
    role,
    onStartNew,
}: {
    report: InterviewAnalysisReport;
    role: string;
    onStartNew: () => void;
}) {
    const handleDownloadPDF = () => {
        window.print();
    };

    const handleShare = async () => {
        const text = `I just scored ${report.overall_score}/100 on my AI Technical Interview! 🚀\n\nVerdict: ${report.final_verdict}\nKey Strength: ${report.content_analysis.key_strengths[0]}\n\nPractice now at The Shadow Instructor.`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Interview Report',
                    text: text,
                });
            } catch (err) {
                // Share was cancelled or failed
            }
        } else {
            await navigator.clipboard.writeText(text);
            alert("Summary copied to clipboard!");
        }
    };

    // Helper for score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
        if (score >= 60) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    };

    return (
        <div className="min-h-screen bg-black text-neutral-200 font-sans antialiased overflow-y-auto selection:bg-neutral-800 print:bg-white print:text-black">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-black/90 backdrop-blur-md print:hidden">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                            <Award className="w-5 h-5 text-black" />
                        </div>
                        <span className="font-semibold text-sm tracking-wide text-white">INTERVIEW REPORT</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 transition-colors text-xs font-medium text-neutral-400"
                        >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                        </button>
                        <button
                            onClick={handleShare}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 transition-colors text-xs font-medium text-neutral-400"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                        </button>
                        <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
                        <button
                            onClick={onStartNew}
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-white text-black hover:bg-neutral-200 transition-colors text-sm font-medium"
                        >
                            <Home className="w-4 h-4" />
                            <span>Exit</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-20 px-6">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header: Score & Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid md:grid-cols-12 gap-6"
                    >
                        {/* Score Block */}
                        <div className="md:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden group break-inside-avoid shadow-sm">
                            <div className="absolute inset-0 bg-linear-to-b from-neutral-800/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 text-center">
                                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-[0.2em]">Overall Score</span>
                                <div className="mt-2 mb-4 flex items-baseline justify-center gap-1">
                                    <span className="text-7xl font-bold text-white tracking-tighter">{report.overall_score}</span>
                                    <span className="text-xl text-neutral-600 font-medium">/100</span>
                                </div>
                                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${["Strong Hire", "Hire"].includes(report.final_verdict) ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                    report.final_verdict === "Weak Hire" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                    }`}>
                                    {report.final_verdict}
                                </div>
                            </div>
                        </div>

                        {/* Executive Summary */}
                        <div className="md:col-span-8 bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col justify-center break-inside-avoid">
                            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Executive Summary
                            </h2>
                            <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                                {report.summary}
                            </p>
                        </div>
                    </motion.div>

                    {/* Analysis Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Speech Metrics */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 break-inside-avoid"
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                                <Activity className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Speech Delivery</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-neutral-400">Clarity & Articulation</span>
                                        <span className="text-white font-medium">{report.speech_analysis.clarity}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-neutral-200" style={{ width: `${report.speech_analysis.clarity}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-neutral-400">Conciseness</span>
                                        <span className="text-white font-medium">{report.speech_analysis.conciseness}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-neutral-400" style={{ width: `${report.speech_analysis.conciseness}%` }} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Pace</div>
                                        <div className="text-sm text-neutral-200 font-medium">{report.speech_analysis.pace}</div>
                                    </div>
                                    <div className="bg-black rounded-lg p-3 border border-neutral-800">
                                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Fillers</div>
                                        <div className="text-sm text-neutral-200 font-medium">{report.speech_analysis.filled_pauses_count} Detected</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Content Metrics */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 break-inside-avoid"
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                                <TrendingUp className="w-5 h-5 text-neutral-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Content Quality</h3>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Technical Accuracy", val: report.content_analysis.technical_accuracy },
                                    { label: "Relevance", val: report.content_analysis.relevance },
                                    { label: "Problem Solving", val: report.content_analysis.problem_solving_skills }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black border border-neutral-800">
                                        <span className="text-xs text-neutral-400 font-medium">{item.label}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-white" style={{ width: `${item.val}%` }} />
                                            </div>
                                            <span className="text-xs text-white font-bold w-8 text-right">{item.val}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-3">
                                <div className="flex gap-3">
                                    <div className="w-1 bg-emerald-500/50 rounded-full" />
                                    <div>
                                        <div className="text-[10px] text-emerald-500/80 uppercase font-bold tracking-wider">Key Strength</div>
                                        <div className="text-xs text-neutral-300 mt-0.5">{report.content_analysis.key_strengths[0]}</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-1 bg-rose-500/50 rounded-full" />
                                    <div>
                                        <div className="text-[10px] text-rose-500/80 uppercase font-bold tracking-wider">Improvement Area</div>
                                        <div className="text-xs text-neutral-300 mt-0.5">{report.content_analysis.areas_for_improvement[0]}</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Question Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Question Analysis</h3>
                        <div className="space-y-4">
                            {report.question_breakdown.map((q, i) => (
                                <div key={i} className="group bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors break-inside-avoid">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <h4 className="text-sm font-medium text-white leading-relaxed flex-1">
                                                <span className="text-neutral-500 mr-2">Q{i + 1}.</span>
                                                {q.question_text}
                                            </h4>
                                            <div className={`shrink-0 px-2 py-1 rounded text-xs font-bold border ${getScoreColor(q.score)}`}>
                                                {q.score}
                                            </div>
                                        </div>

                                        <div className="mt-4 pl-4 border-l-2 border-neutral-800">
                                            <p className="text-xs text-neutral-400 italic mb-2">"{q.user_response_summary}"</p>
                                        </div>

                                        <div className="mt-4 grid md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800/50">
                                            <div>
                                                <div className="flex items-center gap-2 text-neutral-300 text-xs font-bold uppercase tracking-wider mb-2">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Feedback
                                                </div>
                                                <p className="text-xs text-neutral-400 leading-relaxed">{q.feedback}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Ideally
                                                </div>
                                                <p className="text-xs text-neutral-400 leading-relaxed">{q.better_response_suggestion}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Actionable Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 break-inside-avoid"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-blue-500" />
                            Next Steps
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {report.actionable_tips.map((tip, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-black border border-neutral-800">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-400">
                                        {i + 1}
                                    </span>
                                    <p className="text-xs text-neutral-300 leading-relaxed">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}
