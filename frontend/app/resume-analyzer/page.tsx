"use client";

import { useState, useRef } from "react";
import { API_BASE_URL } from "../../utils/api";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  LayoutGrid,
  Type,
  Layers,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { jsPDF } from "jspdf";

type AnalysisIssue = {
  category: string;
  description: string;
  suggestion: string;
};

type AnalysisResult = {
  score: number;
  summary: string;
  issues: AnalysisIssue[];
  strengths: string[];
};

const categoryIcons: Record<string, React.ReactNode> = {
  Layout: <LayoutGrid className="w-4 h-4" />,
  Typography: <Type className="w-4 h-4" />,
  Hierarchy: <Layers className="w-4 h-4" />,
  Aesthetics: <Palette className="w-4 h-4" />,
};

export default function ResumeAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPdfUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiBaseUrl = API_BASE_URL;
      const res = await fetch(`${apiBaseUrl}/analyze-resume-visual`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      if (data.status === "error") {
        throw new Error(data.message || "Analysis failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!result || !file) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 25;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Resume Design Analysis", margin, y);
    y += 10;

    // Subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${file.name} - ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      margin,
      y,
    );
    y += 15;

    // Score
    const scoreColor =
      result.score >= 7
        ? [34, 197, 94]
        : result.score >= 4
          ? [234, 179, 8]
          : [239, 68, 68];
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`${result.score}/10`, margin, y);

    const scoreLabel =
      result.score >= 8
        ? "Excellent"
        : result.score >= 6
          ? "Good"
          : result.score >= 4
            ? "Fair"
            : "Needs Work";
    doc.setFontSize(12);
    doc.text(scoreLabel, margin + 35, y);
    y += 15;

    // Summary
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Summary", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(result.summary, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;

    // Strengths
    if (result.strengths && result.strengths.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text("Strengths", margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      result.strengths.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${s}`, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      });
      y += 8;
    }

    // Suggestions
    if (result.issues && result.issues.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(234, 179, 8);
      doc.text("Suggestions for Improvement", margin, y);
      y += 8;

      result.issues.forEach((issue) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 25;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(issue.category.toUpperCase(), margin, y);
        y += 5;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const descLines = doc.splitTextToSize(issue.description, contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 3;

        doc.setTextColor(34, 197, 94);
        const tipLines = doc.splitTextToSize(
          `Tip: ${issue.suggestion}`,
          contentWidth,
        );
        doc.text(tipLines, margin, y);
        y += tipLines.length * 5 + 8;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Generated by Shadow Instructor Resume Analyzer",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );

    doc.save(`Resume_Analysis_${file.name.replace(".pdf", "")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex pt-16">
        {/* Left: PDF Viewer */}
        <div className="flex-1 border-r border-neutral-800 flex flex-col">
          <div className="h-14 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-medium text-neutral-400">
              Resume Preview
            </h2>
            {file && (
              <span className="text-xs text-neutral-500">{file.name}</span>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-6 bg-neutral-950">
            {pdfUrl ? (
              <object
                data={pdfUrl}
                type="application/pdf"
                className="w-full h-full rounded-lg border border-neutral-800"
              >
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <FileText className="w-12 h-12 mb-3" />
                  <p className="text-sm">
                    PDF preview not supported in this browser
                  </p>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline text-sm mt-2"
                  >
                    Open in new tab
                  </a>
                </div>
              </object>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-neutral-900/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Upload className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-300 font-medium mb-1">
                  Upload Resume
                </p>
                <p className="text-xs text-neutral-500">PDF format only</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Analysis Panel */}
        <div className="w-105 shrink-0 flex flex-col bg-neutral-900/50">
          <div className="h-14 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-medium text-white">Design Analysis</h2>
            {result && (
              <button
                onClick={handleDownloadReport}
                className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!file ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <FileText className="w-10 h-10 text-neutral-600 mb-3" />
                <p className="text-neutral-400 text-sm">
                  Upload a resume to analyze
                </p>
              </div>
            ) : !result && !isAnalyzing && !error ? (
              <div className="h-full flex flex-col items-center justify-center">
                <button
                  onClick={handleAnalyze}
                  className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all"
                >
                  Analyze Design
                </button>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-sm text-white mb-2 font-medium">
                  Analyzing design...
                </p>
                <div className="max-w-xs p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-400 mb-1 justify-center">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Note
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-200/70 leading-relaxed">
                    First request can take up to 50 seconds as our backend wakes
                    up from inactivity. Subsequent analysis will be
                    near-instant!
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-red-300 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Analysis Failed</span>
                </div>
                <p className="text-xs text-red-200/80">{error}</p>
                <button
                  onClick={handleAnalyze}
                  className="mt-3 text-xs text-white underline"
                >
                  Retry
                </button>
              </div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Score */}
                <div className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 64 64"
                    >
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#262626"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke={
                          result.score >= 7
                            ? "#22c55e"
                            : result.score >= 4
                              ? "#eab308"
                              : "#ef4444"
                        }
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={176}
                        strokeDashoffset={176 - (176 * result.score) / 10}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="text-lg font-bold">{result.score}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Overall Score
                    </h3>
                    <p className="text-sm text-neutral-300">{result.summary}</p>
                  </div>
                </div>

                {/* Strengths */}
                {result.strengths && result.strengths.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      Strengths
                    </h3>
                    <div className="space-y-1.5">
                      {result.strengths.map((s, i) => (
                        <div
                          key={i}
                          className="text-sm text-neutral-300 pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-green-400"
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {result.issues && result.issues.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                      Suggestions
                    </h3>
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            {categoryIcons[issue.category] || (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span className="text-xs font-medium text-neutral-400">
                              {issue.category}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-200 mb-1.5">
                            {issue.description}
                          </p>
                          <p className="text-xs text-neutral-400 flex items-start gap-1.5">
                            <span className="text-green-400 shrink-0">→</span>
                            {issue.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download */}
                <button
                  onClick={handleDownloadReport}
                  className="w-full py-3 border border-neutral-700 hover:border-neutral-500 rounded-xl flex items-center justify-center gap-2 text-sm text-neutral-300 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Report
                </button>

                {/* Analyze Again */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 text-neutral-500 hover:text-white text-sm transition-colors"
                >
                  Upload Different Resume
                </button>
              </motion.div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
