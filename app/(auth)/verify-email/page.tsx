import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">K33pr</h1>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-primary/20">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-foreground">Verify your email</h2>

          <p className="text-sm text-foreground-secondary">
            We&apos;ve sent a confirmation link to your email address. Please check your inbox and click the link to activate your account.
          </p>

          <p className="text-xs text-foreground-secondary">
            Didn&apos;t receive an email? Check your spam folder or{' '}
            <Link href="/signup" className="text-primary hover:opacity-80">
              try signing up again
            </Link>.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-foreground-secondary">
          Already verified?{' '}
          <Link href="/login" className="font-medium text-primary hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
