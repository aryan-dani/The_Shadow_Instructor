"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react"; // Import AlertCircle
import { createClient } from "@/utils/supabase/client";
import { API_BASE_URL } from "@/utils/api";
import { FeedbackDashboard } from "@/components/FeedbackDashboard";
import {
  ParsedResume,
  InterviewAnalysisReport,
  ChatMessage,
  InterviewState,
} from "@/types";
import { LandingPage } from "@/components/LandingPage";
import { InterviewSession } from "@/components/InterviewSession";

// ==================== MAIN APP ====================
export default function Home() {
  const [interviewData, setInterviewData] = useState<InterviewState | null>(
    null,
  );
  const [analysisResult, setAnalysisResult] =
    useState<InterviewAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>(
    [],
  );
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load state and user on mount
  useEffect(() => {
    setIsClient(true);

    // Get current user
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

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
      const res = await fetch(`${API_BASE_URL}/analyze-interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: interviewData?.role || "Software Engineer",
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          user_id: userId, // Pass the user ID for saving
        }),
      });

      if (!res.ok) {
        // Handle non-200 responses gracefully
        const errText = await res.text();
        console.error("Analysis failed:", errText);
        throw new Error("Analysis failed");
      }

      const data: InterviewAnalysisReport = await res.json();
      setAnalysisResult(data);

      // SAVE TO DATABASE (Decoupled from Backend)
      if (userId) {
        try {
          const supabase = createClient();
          const transcript = messages
            .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join("\n");

          const { data: interview, error: intError } = await supabase
            .from("interviews")
            .insert({
              user_id: userId,
              job_role: interviewData?.role || "Software Engineer",
              topic: "General Interview",
              overall_score: data.overall_score,
              transcript: transcript,
            })
            .select()
            .single();

          if (interview && !intError) {
            const metrics = [
              {
                interview_id: interview.id,
                metric_name: "Clarity",
                score: data.speech_analysis.clarity,
              },
              {
                interview_id: interview.id,
                metric_name: "Conciseness",
                score: data.speech_analysis.conciseness,
              },
              {
                interview_id: interview.id,
                metric_name: "Technical Accuracy",
                score: data.content_analysis.technical_accuracy,
              },
              {
                interview_id: interview.id,
                metric_name: "Problem Solving",
                score: data.content_analysis.problem_solving_skills,
              },
            ];
            await supabase.from("interview_metrics").insert(metrics);
          } else {
            console.error("Supabase Save Error:", intError);
          }
        } catch (dbErr) {
          console.error("Failed to save to Supabase:", dbErr);
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Failed to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartNew = () => {
    setInterviewData(null);
    setAnalysisResult(null);
    setConversationHistory([]);
    setError(null);
    sessionStorage.clear();
  };

  if (!isClient) return null; // Prevent hydration mismatch

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Analysis Failed</h3>
          <p className="text-neutral-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => handleAnalyze(conversationHistory)}
              className="px-6 py-2 bg-white text-black font-medium rounded-xl hover:bg-neutral-200 transition"
            >
              Retry
            </button>
            <button
              onClick={handleStartNew}
              className="px-6 py-2 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="text-xl font-semibold mb-2">
            Analyzing Your Interview
          </h2>
          <p className="text-neutral-500 text-sm">
            Generating your professional report...
          </p>
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
          <InterviewSession
            interviewData={interviewData}
            onEnd={() => setInterviewData(null)}
            onAnalyze={handleAnalyze}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
