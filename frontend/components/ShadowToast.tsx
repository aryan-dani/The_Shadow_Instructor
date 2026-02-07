import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Eye, Mic } from "lucide-react";
import { ShadowFeedback } from "@/hooks/useShadowObserver";

export function ShadowToast({ feedback }: { feedback: ShadowFeedback | null }) {
    if (!feedback) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md ${feedback.level === "alert"
                    ? "bg-red-500/10 border-red-500/50 text-red-100"
                    : "bg-neutral-900/80 border-neutral-700 text-neutral-200"
                    }`}
            >
                {feedback.category === "vision" ? (
                    <Eye className={`w-5 h-5 ${feedback.level === "alert" ? "text-red-400" : "text-neutral-400"}`} />
                ) : (
                    <Mic className={`w-5 h-5 ${feedback.level === "alert" ? "text-red-400" : "text-neutral-400"}`} />
                )}

                <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                        The Shadow says:
                    </span>
                    <span className="font-medium text-sm">
                        {feedback.message}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
