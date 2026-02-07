"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Medal, Crown } from "lucide-react";

type LeaderboardEntry = {
    id: string;
    user_id: string;
    overall_score: number;
    created_at: string;
    profiles: {
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    } | null;
};

export default function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const getData = async () => {
            // Fetch top 50 interviews by score
            const { data, error } = await supabase
                .from("interviews")
                .select(`
          id,
          user_id,
          overall_score,
          created_at,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
                .order("overall_score", { ascending: false })
                .limit(50);

            if (data) {
                setEntries(data as any[]);
            }
            setLoading(false);
        };
        getData();
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <Crown className="w-6 h-6 text-yellow-500" />;
            case 1:
                return <Medal className="w-6 h-6 text-gray-400" />;
            case 2:
                return <Medal className="w-6 h-6 text-amber-600" />;
            default:
                return <span className="text-neutral-500 font-mono w-6 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans antialiased">
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-24">
                <div className="flex items-center gap-4 mb-8">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <h1 className="text-3xl font-bold">Leaderboard</h1>
                </div>

                {loading ? (
                    <div className="text-neutral-400">Loading...</div>
                ) : entries.length === 0 ? (
                    <div className="text-neutral-400">No entries yet. Be the first!</div>
                ) : (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
                        <div className="divide-y divide-neutral-800">
                            {entries.map((entry, index) => (
                                <div key={entry.id} className="flex items-center p-4 hover:bg-neutral-800/50 transition-colors">
                                    <div className="shrink-0 w-12 flex justify-center">
                                        {getRankIcon(index)}
                                    </div>
                                    <div className="flex-1 ml-4">
                                        <div className="font-medium text-white">
                                            {entry.profiles?.full_name || entry.profiles?.email?.split('@')[0] || "Anonymous"}
                                        </div>
                                        <div className="text-xs text-neutral-500">
                                            {new Date(entry.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${entry.overall_score >= 90 ? 'bg-yellow-500/20 text-yellow-400' :
                                            entry.overall_score >= 80 ? 'bg-green-500/20 text-green-400' :
                                                entry.overall_score >= 60 ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-neutral-800 text-neutral-400'
                                            }`}>
                                            {entry.overall_score}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
