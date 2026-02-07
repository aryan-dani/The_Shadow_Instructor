import Link from "next/link";
import { GraduationCap, Github } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-neutral-800 py-6 px-6">
            <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 text-neutral-500 text-sm">
                <Link href="/copyright" className="flex items-center gap-2 hover:text-white transition-colors">
                    <GraduationCap className="w-4 h-4" />
                    <span>Shadow Instructor</span>
                </Link>
                <span>•</span>
                <a
                    href="https://github.com/aryan-dani/The_Shadow_Instructor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                    <Github className="w-4 h-4" />
                    <span className="hidden sm:inline">GitHub</span>
                </a>
                <span>•</span>
                <span>© 2026</span>
            </div>
        </footer>
    );
}
