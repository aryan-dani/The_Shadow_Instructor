"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

// Since we don't know if shadcn table exists, let's use standard Tailwind table for now to be safe.

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const getData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data, error } = await supabase
                    .from("interviews")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (data) setInterviews(data);
            }
            setLoading(false);
        };
        getData();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white font-sans antialiased">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-24">
                <h1 className="text-3xl font-bold mb-8">My Interviews</h1>

                {loading ? (
                    <div className="text-neutral-400">Loading...</div>
                ) : !user ? (
                    <div className="text-neutral-400">Please login to view your interviews.</div>
                ) : interviews.length === 0 ? (
                    <div className="text-neutral-400">No interviews found. Start one!</div>
                ) : (
                    <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-900/50">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium">Overall Score</th>
                                    <th className="px-6 py-4 font-medium">Topic</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 text-neutral-300">
                                {interviews.map((interview) => (
                                    <tr key={interview.id} className="hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(interview.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">{interview.job_role}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${interview.overall_score >= 80 ? 'bg-green-500/20 text-green-400' :
                                                interview.overall_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {interview.overall_score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{interview.topic}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
