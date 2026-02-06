"use client";

import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft, Github } from "lucide-react";
import Link from "next/link";

export default function CopyrightPage() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-sans">
            {/* Header */}
            <header className="border-b border-neutral-800 py-6 px-6">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 py-16 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold">Shadow Instructor</h1>
                            <p className="text-neutral-500 text-sm">AI-Powered Interview Practice</p>
                        </div>
                    </div>

                    <div className="space-y-8 text-neutral-300">
                        <section>
                            <h2 className="text-lg font-medium text-white mb-3">Copyright Notice</h2>
                            <p className="leading-relaxed">
                                © 2026 Shadow Instructor. All rights reserved.
                            </p>
                            <p className="leading-relaxed mt-2">
                                This software and its associated documentation are protected by copyright law.
                                Unauthorized reproduction, distribution, or modification of this material is prohibited.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-medium text-white mb-3">Open Source</h2>
                            <p className="leading-relaxed">
                                Shadow Instructor is an open-source project. You can view, contribute to,
                                and use the source code under the terms of our license.
                            </p>
                            <a
                                href="https://github.com/aryan-dani/The_Shadow_Instructor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors text-sm"
                            >
                                <Github className="w-4 h-4" />
                                View on GitHub
                            </a>
                        </section>

                        <section>
                            <h2 className="text-lg font-medium text-white mb-3">Created By</h2>
                            <div className="flex items-center gap-2">
                                <a
                                    href="https://www.aryandani.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white hover:text-neutral-300 transition-colors"
                                >
                                    Aryan Dani
                                </a>
                                <span className="text-neutral-600">&</span>
                                <span className="text-white">Himali Dandavate</span>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-800 py-6 px-6">
                <div className="max-w-4xl mx-auto text-center text-neutral-500 text-sm">
                    <span>© 2026 Shadow Instructor</span>
                </div>
            </footer>
        </div>
    );
}
