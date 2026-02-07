import { createClient } from '@/utils/supabase/server'
import { Trophy } from 'lucide-react'

export default async function LeaderboardPage() {
    const supabase = await createClient()
    const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('*')
        .order('overall_score', { ascending: false })
        .limit(50)

    return (
        <div className="min-h-screen bg-[#fdfaf6] p-8 text-[#1a1a1a]">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        <Trophy className="h-8 w-8" />
                    </div>
                    <h1 className="font-serif text-4xl font-medium tracking-tight">Interview Leaderboard</h1>
                    <p className="mt-4 text-gray-500">Top performers in our interview simulations</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Rank</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Topic</th>
                                <th className="px-6 py-4 font-medium">Score</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaderboard?.map((entry, index) => (
                                <tr key={entry.id} className="transition-colors hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">#{index + 1}</td>
                                    <td className="px-6 py-4 font-medium">{entry.job_role}</td>
                                    <td className="px-6 py-4 text-gray-500">{entry.topic}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                            {entry.overall_score}/100
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {!leaderboard?.length && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        No interviews recorded yet. Be the first!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
