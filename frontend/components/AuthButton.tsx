'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'

export default function AuthButton() {
    const [user, setUser] = useState<User | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
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

    return (
        <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium hidden md:block">
                        {user.user_metadata.full_name || user.email}
                    </span>
                    {/* Add Avatar here if needed */}
                    <button onClick={handleLogout} className="text-red-500 hover:text-red-600 border border-red-200 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        Sign Out
                    </button>
                </div>
            ) : (
                <button onClick={handleLogin} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Login with Google
                </button>
            )}
        </div>
    )
}
