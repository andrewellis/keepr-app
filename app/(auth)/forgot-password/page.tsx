'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/auth/actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await forgotPassword(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Wearnings</h1>
          <p className="mt-2 text-sm text-foreground-secondary">Reset your password</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-900/30">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-foreground-secondary">
                We&apos;ve sent a password reset link to your email address. It may take a few minutes to arrive.
              </p>
              <Link href="/login" className="inline-block mt-2 text-sm font-medium text-primary hover:opacity-80">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-5">
              <p className="text-sm text-foreground-secondary">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="rounded-lg bg-red-900/30 border border-red-800 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

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
                  'Send reset link'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-foreground-secondary">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-primary hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
