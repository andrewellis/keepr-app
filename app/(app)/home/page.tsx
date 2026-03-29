import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? 'there'
  const firstName = displayName.split(' ')[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground-secondary">Good day,</p>
          <h1 className="text-2xl font-bold text-foreground">{firstName} 👋</h1>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="text-xs text-foreground-secondary border border-border rounded-lg px-3 py-1.5 hover:border-primary hover:text-primary transition"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Balance card */}
      <div className="mx-5 mt-2 bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm text-foreground-secondary mb-1">Total Earnings</p>
        <p className="text-4xl font-bold text-foreground">$0.00</p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">This Week</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">$0.00</p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">This Month</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">$0.00</p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">Pending</p>
            <p className="text-lg font-semibold text-primary mt-0.5">$0.00</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mx-5 mt-5">
        <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/scan"
            className="bg-primary rounded-2xl p-5 flex flex-col gap-2 hover:opacity-90 transition"
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8H3m18-8h-2M5 4H3m2 16H3m18-4h-2M19 4h-2" />
            </svg>
            <span className="text-sm font-semibold text-white">Scan Product</span>
          </a>
          <a
            href="/history"
            className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-2 hover:border-primary transition"
          >
            <svg className="w-7 h-7 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-sm font-semibold text-foreground">View History</span>
          </a>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="mx-5 mt-5">
        <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-foreground-secondary text-sm">No items scanned yet.</p>
          <p className="text-foreground-secondary text-xs mt-1">Scan a product to get started.</p>
        </div>
      </div>
    </div>
  )
}
