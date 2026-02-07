'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'

export default function AuthButton() {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setIsLoading(false)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setIsLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        setUser(null)
    }

    // Show skeleton while loading to prevent flash
    if (isLoading) {
        return (
            <div className="flex items-center gap-4">
                <div className="h-9 w-24 bg-neutral-800 rounded-lg animate-pulse" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-600 flex items-center justify-center text-xs font-medium overflow-hidden">
                        {user.user_metadata.avatar_url ? (
                            <img
                                src={user.user_metadata.avatar_url}
                                alt={user.user_metadata.full_name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            (user.user_metadata.full_name || user.email || 'U').charAt(0).toUpperCase()
                        )}
                    </div>
                    <span className="text-sm font-medium hidden md:block text-neutral-300">
                        {user.user_metadata.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleLogin}
                    className="bg-white hover:bg-neutral-200 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Login with Google
                </button>
            )}
        </div>
    )
}
