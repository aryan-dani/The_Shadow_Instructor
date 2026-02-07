'use client'

import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Navbar } from '@/components/Navbar'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async () => {
        setIsLoading(true)
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Navbar />

            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm p-8"
                >
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight">Welcome Back</h1>
                        <p className="mt-2 text-sm text-neutral-500">Sign in to continue to your dashboard</p>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800 px-6 py-3 text-sm font-medium transition-all hover:bg-neutral-700 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                        ) : (
                            <>
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    <p className="mt-8 text-center text-xs text-neutral-600">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
