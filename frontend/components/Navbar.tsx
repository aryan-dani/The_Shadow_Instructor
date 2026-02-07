"use client";

import Link from "next/link";
import { GraduationCap, Github } from "lucide-react";
import AuthButton from "./AuthButton";

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-800 bg-black/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-black" />
                        </div>
                        <span className="font-semibold text-lg tracking-tight text-white">Shadow Instructor</span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                            Interview
                        </Link>
                        <Link href="/dashboard" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                            Dashboard
                        </Link>
                        <Link href="/leaderboard" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                            Leaderboard
                        </Link>
                        <Link href="/resume-analyzer" className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors rounded-md hover:bg-neutral-800/50">
                            Resume Analyzer
                        </Link>
                    </div>
                </div>

                {/* Right: Account */}
                <div className="flex items-center gap-4">
                    <a
                        href="https://github.com/aryan-dani/The_Shadow_Instructor"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        <Github className="w-5 h-5" />
                    </a>
                    <AuthButton />
                </div>
            </div>
        </nav>
    );
}
