import Link from 'next/link'

export default function PayoutSettingsPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-primary transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Settings
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">Payout Settings</h1>

      <div className="bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-foreground-secondary text-sm">
          Payout setup coming in Phase 4A.
        </p>
      </div>
    </div>
  )
}
