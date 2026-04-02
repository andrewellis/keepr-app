'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/auth/actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('keepr_anon_id') : null
    if (sessionToken) {
      try {
        await fetch('/api/migrate-session', {
          method: 'POST',
          headers: { 'X-Session-Token': sessionToken },
        })
      } catch {}
      localStorage.removeItem('keepr_anon_id')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">K33pr</h1>
          <p className="mt-2 text-sm text-foreground-secondary">Create your account</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <form action={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1.5">
                Full name
              </label>
              <input
                id="full_name"
                name="display_name"
                type="text"
                autoComplete="name"
                required
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-foreground mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="invite_code" className="block text-sm font-medium text-foreground mb-1.5">
                Invite code
              </label>
              <input
                id="invite_code"
                name="invite_code"
                type="text"
                autoComplete="off"
                required
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition uppercase"
                placeholder="Enter your beta invite code"
              />
              <p className="mt-1.5 text-xs text-foreground-secondary">
                K33pr is currently invite-only. Enter your code to join.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Create account'
              )}
            </button>

            <p className="text-xs text-foreground-secondary text-center">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:opacity-80">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:opacity-80">Privacy Policy</Link>.
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-foreground-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
