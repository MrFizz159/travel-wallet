'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
            Tap it to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Travel Wallet</h1>
        <p className="text-muted-foreground text-sm mb-8">Enter your email to sign in.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-status-at-risk">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  )
}
