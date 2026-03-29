import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Wearnings</h1>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-red-900/30">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-foreground">Authentication error</h2>

          <p className="text-sm text-foreground-secondary">
            The link you used is invalid or has expired. Please request a new one.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/forgot-password"
              className="inline-flex justify-center items-center rounded-lg bg-primary hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
            >
              Request new reset link
            </Link>
            <Link
              href="/login"
              className="inline-flex justify-center items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface transition"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
