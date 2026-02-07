import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, Videotape, TrendingUp, Target, Calendar } from 'lucide-react'
import { Navbar } from '@/components/Navbar'

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: interviews } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Calculate stats
    const totalInterviews = interviews?.length || 0
    const avgScore = interviews?.length
        ? Math.round(interviews.reduce((acc, i) => acc + (i.overall_score || 0), 0) / interviews.length)
        : 0
    const bestScore = interviews?.length
        ? Math.max(...interviews.map(i => i.overall_score || 0))
        : 0
    const totalMinutes = interviews?.reduce((acc, i) => acc + Math.round((i.duration_seconds || 0) / 60), 0) || 0

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Navbar />

            {/* Header */}
            <div className="pt-24 px-6 pb-6">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                            <p className="mt-1 text-neutral-500">
                                {user.user_metadata.full_name || user.email}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                        >
                            New Interview
                        </Link>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                            <div className="text-xs text-neutral-500 mb-1">Total Interviews</div>
                            <div className="text-2xl font-semibold">{totalInterviews}</div>
                        </div>

                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                            <div className="text-xs text-neutral-500 mb-1">Average Score</div>
                            <div className="text-2xl font-semibold">
                                {avgScore}<span className="text-base text-neutral-600">/100</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                            <div className="text-xs text-neutral-500 mb-1">Best Score</div>
                            <div className="text-2xl font-semibold">
                                {bestScore}<span className="text-base text-neutral-600">/100</span>
                            </div>
                        </div>

                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
                            <div className="text-xs text-neutral-500 mb-1">Practice Time</div>
                            <div className="text-2xl font-semibold">
                                {totalMinutes}<span className="text-base text-neutral-600"> min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interviews Section */}
            <div className="px-6 pb-12">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-medium">Recent Interviews</h2>
                        <Link href="/leaderboard" className="text-xs text-neutral-500 hover:text-white transition-colors">
                            View Leaderboard
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {interviews?.map((interview) => (
                            <div
                                key={interview.id}
                                className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 transition-colors hover:border-neutral-700"
                            >
                                <div className="mb-3 flex items-start justify-between">
                                    <div className="rounded-lg bg-neutral-800 border border-neutral-700 p-2">
                                        <Target className="h-4 w-4 text-neutral-400" />
                                    </div>
                                    {interview.overall_score && (
                                        <span className={`text-sm font-medium ${interview.overall_score >= 80 ? 'text-green-400'
                                                : interview.overall_score >= 60 ? 'text-yellow-400'
                                                    : 'text-neutral-400'
                                            }`}>
                                            {interview.overall_score}/100
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-medium text-white text-sm mb-0.5">{interview.job_role}</h3>
                                <p className="text-xs text-neutral-500 mb-3">{interview.topic}</p>

                                <div className="flex items-center gap-4 text-xs text-neutral-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {Math.round((interview.duration_seconds || 0) / 60)} min
                                    </div>
                                    <div>
                                        {new Date(interview.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!interviews?.length && (
                            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 py-12 text-center">
                                <p className="text-neutral-500 mb-4">No interviews yet.</p>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                                >
                                    Start Interview
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
