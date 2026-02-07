import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Clock, Star, Videotape } from 'lucide-react'

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

    return (
        <div className="min-h-screen bg-[#fdfaf6] text-[#1a1a1a]">
            {/* Header */}
            <div className="border-b border-black/5 bg-white px-8 py-8">
                <div className="mx-auto flex max-w-6xl justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-medium tracking-tight">Your Dashboard</h1>
                        <p className="mt-2 text-gray-500">Welcome back, {user.user_metadata.full_name}</p>
                    </div>
                    <Link
                        href="/"
                        className="flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                        Start New Interview
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-6xl px-8 py-12">
                <h2 className="mb-6 font-medium text-gray-900">Recent Interviews</h2>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {interviews?.map((interview) => (
                        <div
                            key={interview.id}
                            className="group relative overflow-hidden rounded-xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div className="rounded-lg bg-gray-50 p-2">
                                    <Videotape className="h-6 w-6 text-gray-700" />
                                </div>
                                {interview.overall_score && (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                        Score: {interview.overall_score}
                                    </span>
                                )}
                            </div>

                            <h3 className="font-medium text-gray-900">{interview.job_role}</h3>
                            <p className="mb-4 text-sm text-gray-500">{interview.topic}</p>

                            <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {Math.round(interview.duration_seconds / 60)} mins
                                </div>
                                <div>{new Date(interview.created_at).toLocaleDateString()}</div>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-gray-50 py-3 text-sm font-medium text-gray-900 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                                View Details <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    ))}

                    {!interviews?.length && (
                        <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                            <div className="mb-3 rounded-full bg-gray-100 p-3">
                                <Star className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-900">No interviews yet</p>
                            <p className="mt-1 max-w-sm text-sm text-gray-500">
                                Complete your first interview simulation to see your progress and metrics here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
