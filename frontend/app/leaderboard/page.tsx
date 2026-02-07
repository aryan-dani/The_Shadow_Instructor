import { createClient } from '@/utils/supabase/server'
import { Trophy, Medal, Crown, TrendingUp, Users } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import Link from 'next/link'

export default async function LeaderboardPage() {
    const supabase = await createClient()
    const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('*, profiles(full_name, avatar_url)')
        .order('overall_score', { ascending: false })
        .limit(50)

    // Get top 3 for podium
    const top3 = leaderboard?.slice(0, 3) || []

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
        if (rank === 2) return <Medal className="w-4 h-4 text-neutral-400" />
        if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
        return null
    }

    const getRankBorder = (rank: number) => {
        if (rank === 1) return 'border-yellow-500/30'
        if (rank === 2) return 'border-neutral-500/30'
        if (rank === 3) return 'border-amber-600/30'
        return 'border-neutral-800'
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Navbar />

            <main className="pt-24 px-6 pb-12">
                <div className="mx-auto max-w-4xl">
                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
                        <p className="mt-2 text-neutral-500">Performance rankings from interview simulations</p>
                    </div>

                    {/* Top 3 Cards */}
                    {top3.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mb-10">
                            {/* 2nd Place */}
                            <div className="order-1">
                                {top3[1] && (
                                    <div className={`bg-neutral-900/80 rounded-xl p-4 border ${getRankBorder(2)} text-center`}>
                                        <div className="flex items-center justify-center gap-1.5 mb-3">
                                            <Medal className="w-4 h-4 text-neutral-400" />
                                            <span className="text-xs font-medium text-neutral-500">2nd</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                                            {(top3[1].profiles?.full_name || 'A').charAt(0)}
                                        </div>
                                        <div className="font-medium text-sm text-white truncate mb-0.5">
                                            {top3[1].profiles?.full_name || 'Anonymous'}
                                        </div>
                                        <div className="text-xs text-neutral-500 mb-2">{top3[1].job_role}</div>
                                        <div className="text-lg font-semibold text-neutral-300">{top3[1].overall_score}</div>
                                    </div>
                                )}
                            </div>

                            {/* 1st Place */}
                            <div className="order-2">
                                {top3[0] && (
                                    <div className={`bg-neutral-900/80 rounded-xl p-5 border ${getRankBorder(1)} text-center`}>
                                        <div className="flex items-center justify-center gap-1.5 mb-3">
                                            <Crown className="w-4 h-4 text-yellow-400" />
                                            <span className="text-xs font-medium text-yellow-500/70">1st</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-yellow-500/30 flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                                            {(top3[0].profiles?.full_name || 'A').charAt(0)}
                                        </div>
                                        <div className="font-medium text-white truncate mb-0.5">
                                            {top3[0].profiles?.full_name || 'Anonymous'}
                                        </div>
                                        <div className="text-xs text-neutral-500 mb-2">{top3[0].job_role}</div>
                                        <div className="text-xl font-semibold text-yellow-400">{top3[0].overall_score}</div>
                                    </div>
                                )}
                            </div>

                            {/* 3rd Place */}
                            <div className="order-3">
                                {top3[2] && (
                                    <div className={`bg-neutral-900/80 rounded-xl p-4 border ${getRankBorder(3)} text-center`}>
                                        <div className="flex items-center justify-center gap-1.5 mb-3">
                                            <Medal className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-medium text-amber-600/70">3rd</span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-2 text-sm font-medium">
                                            {(top3[2].profiles?.full_name || 'A').charAt(0)}
                                        </div>
                                        <div className="font-medium text-sm text-white truncate mb-0.5">
                                            {top3[2].profiles?.full_name || 'Anonymous'}
                                        </div>
                                        <div className="text-xs text-neutral-500 mb-2">{top3[2].job_role}</div>
                                        <div className="text-lg font-semibold text-amber-500">{top3[2].overall_score}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rankings Table */}
                    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80">
                        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-400">All Rankings</span>
                            <span className="text-xs text-neutral-600">{leaderboard?.length || 0} entries</span>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-800/50 text-neutral-500 text-xs">
                                <tr>
                                    <th className="px-5 py-3 font-medium w-16">Rank</th>
                                    <th className="px-5 py-3 font-medium">Candidate</th>
                                    <th className="px-5 py-3 font-medium hidden md:table-cell">Role</th>
                                    <th className="px-5 py-3 font-medium text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {leaderboard?.map((entry, index) => (
                                    <tr key={entry.id} className="transition-colors hover:bg-neutral-800/30">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                {getRankIcon(index + 1)}
                                                <span className={`font-medium ${index < 3 ? 'text-white' : 'text-neutral-500'}`}>
                                                    {index + 1}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-medium">
                                                    {(entry.profiles?.full_name || 'A').charAt(0)}
                                                </div>
                                                <span className="font-medium text-white text-sm">
                                                    {entry.profiles?.full_name || 'Anonymous'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-neutral-500 text-sm hidden md:table-cell">{entry.job_role}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`text-sm font-medium ${entry.overall_score >= 80 ? 'text-green-400'
                                                    : entry.overall_score >= 60 ? 'text-yellow-400'
                                                        : 'text-neutral-400'
                                                }`}>
                                                {entry.overall_score}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!leaderboard?.length && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-12 text-center">
                                            <p className="text-neutral-500 mb-4">No interviews recorded yet.</p>
                                            <Link
                                                href="/"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                                            >
                                                Start Interview
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
