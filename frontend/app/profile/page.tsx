'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User, Mail, Loader2, Check, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

interface Profile {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
    updated_at: string | null
}

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [fullName, setFullName] = useState('')
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }
        setUser(user)

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileData) {
            setProfile(profileData)
            setFullName(profileData.full_name || '')
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        setSuccess(false)

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (!error) {
            setProfile(prev => prev ? { ...prev, full_name: fullName.trim() } : null)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        }
        setSaving(false)
    }

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

            <main className="flex-1 pt-24 px-6 pb-12">
                <div className="mx-auto max-w-2xl">
                    {/* Back Link */}
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
                        <p className="mt-2 text-neutral-500">Manage your account information</p>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-6">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-4 pb-6 border-b border-neutral-800">
                            <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xl font-medium overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.full_name || 'User'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-white">
                                    {profile?.full_name || 'No name set'}
                                </div>
                                <div className="text-sm text-neutral-500">
                                    {profile?.email}
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="pt-6 space-y-6">
                            {/* Email (Read-only) */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">
                                    Email
                                </label>
                                <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-500 text-sm">
                                    <Mail className="w-4 h-4" />
                                    {profile?.email || 'Not available'}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1.5">
                                    Email is managed through your Google account
                                </p>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">
                                    Display Name
                                </label>
                                <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus-within:border-neutral-600">
                                    <User className="w-4 h-4 text-neutral-500" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center gap-4 pt-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || fullName === profile?.full_name}
                                    className="px-5 py-2.5 bg-white text-black font-medium rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : success ? (
                                        <Check className="w-4 h-4" />
                                    ) : null}
                                    {success ? 'Saved' : 'Save Changes'}
                                </button>

                                {success && (
                                    <span className="text-sm text-green-400">
                                        Profile updated successfully
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="mt-6 bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                        <h3 className="text-sm font-medium text-neutral-400 mb-3">Account Information</h3>
                        <div className="grid gap-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">User ID</span>
                                <span className="text-neutral-400 font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Last Updated</span>
                                <span className="text-neutral-400">
                                    {profile?.updated_at
                                        ? new Date(profile.updated_at).toLocaleDateString()
                                        : 'Never'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
