'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Target, Trash2, Pencil, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

interface Interview {
    id: string
    user_id: string
    created_at: string
    job_role: string
    topic: string
    overall_score: number | null
    duration_seconds: number | null
    custom_name: string | null
}

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const [interviews, setInterviews] = useState<Interview[]>([])
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [editId, setEditId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }
        setUser(user)

        const { data: interviewData } = await supabase
            .from('interviews')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        setInterviews(interviewData || [])
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        setActionLoading(true)
        const { error } = await supabase
            .from('interviews')
            .delete()
            .eq('id', id)

        if (!error) {
            setInterviews(prev => prev.filter(i => i.id !== id))
        }
        setDeleteId(null)
        setActionLoading(false)
    }

    const handleRename = async (id: string) => {
        if (!editName.trim()) return
        setActionLoading(true)
        const { error } = await supabase
            .from('interviews')
            .update({ custom_name: editName.trim() })
            .eq('id', id)

        if (!error) {
            setInterviews(prev => prev.map(i =>
                i.id === id ? { ...i, custom_name: editName.trim() } : i
            ))
        }
        setEditId(null)
        setEditName('')
        setActionLoading(false)
    }

    const startEdit = (interview: Interview) => {
        setEditId(interview.id)
        setEditName(interview.custom_name || `${interview.job_role} - ${interview.topic}`)
    }

    // Calculate stats
    const totalInterviews = interviews.length
    const avgScore = interviews.length
        ? Math.round(interviews.reduce((acc, i) => acc + (i.overall_score || 0), 0) / interviews.length)
        : 0
    const bestScore = interviews.length
        ? Math.max(...interviews.map(i => i.overall_score || 0))
        : 0
    const totalMinutes = interviews.reduce((acc, i) => acc + Math.round((i.duration_seconds || 0) / 60), 0)

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col">
            <Navbar />

            {/* Main Content */}
            <main className="flex-1 pt-24 px-6 pb-12">
                <div className="mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                            <p className="mt-1 text-neutral-500">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors"
                        >
                            New Interview
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Total Interviews</div>
                            <div className="text-2xl font-semibold">{totalInterviews}</div>
                        </div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Average Score</div>
                            <div className="text-2xl font-semibold">
                                {avgScore}<span className="text-base text-neutral-600">/100</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Best Score</div>
                            <div className="text-2xl font-semibold">
                                {bestScore}<span className="text-base text-neutral-600">/100</span>
                            </div>
                        </div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Practice Time</div>
                            <div className="text-2xl font-semibold">
                                {totalMinutes}<span className="text-base text-neutral-600"> min</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Interviews */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-medium">Recent Interviews</h2>
                        <Link href="/leaderboard" className="text-xs text-neutral-500 hover:text-white transition-colors">
                            View Leaderboard
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {interviews.map((interview) => (
                            <div
                                key={interview.id}
                                className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 transition-colors hover:border-neutral-700 group"
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

                                <h3 className="font-medium text-white text-sm mb-0.5">
                                    {interview.custom_name || interview.job_role}
                                </h3>
                                <p className="text-xs text-neutral-500 mb-3">{interview.topic}</p>

                                <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                                    <div className="flex items-center gap-4 text-xs text-neutral-600">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {Math.round((interview.duration_seconds || 0) / 60)} min
                                        </div>
                                        <div>
                                            {new Date(interview.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEdit(interview)}
                                            className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-500 hover:text-white transition-colors"
                                            title="Rename"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(interview.id)}
                                            className="p-1.5 rounded-md hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {!interviews.length && (
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
            </main>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-medium text-white mb-2">Delete Interview</h3>
                        <p className="text-sm text-neutral-400 mb-6">
                            Are you sure you want to delete this interview? This action cannot be undone.
                        </p>
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => setDeleteId(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteId && handleDelete(deleteId)}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {editId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-medium text-white mb-4">Rename Interview</h3>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:border-neutral-600 outline-none mb-4"
                            placeholder="Enter new name"
                        />
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={() => { setEditId(null); setEditName(''); }}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => editId && handleRename(editId)}
                                disabled={actionLoading || !editName.trim()}
                                className="px-4 py-2 text-sm font-medium bg-white text-black hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}
