import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import EditDisplayName from './EditDisplayName'
import CardSettings from './CardSettings'

export default async function SettingsPage() {
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

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      {/* Account section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Account
        </p>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Display name — editable */}
          <EditDisplayName currentName={profile?.display_name ?? ''} />

          <div className="h-px bg-border mx-4" />

          {/* Email — read-only */}
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground-secondary">Email</span>
            <span className="text-sm text-foreground font-medium truncate max-w-[200px]">
              {user.email}
            </span>
          </div>
        </div>
      </div>

      {/* Credit Card Rewards section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Credit Card Rewards
        </p>
        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="text-sm text-foreground font-semibold mb-1">Your Credit Cards</p>
          <p className="text-xs text-foreground-secondary mb-4">
            Select your credit cards to get personalized rewards recommendations. Toggle cards on or off, and set one as your primary card.
          </p>
          <CardSettings />
        </div>
      </div>

      {/* Payout settings */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Payout Settings
        </p>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <a href="/settings/payout" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">Payout Method</span>
            <div className="flex items-center gap-1.5">
              {profile?.payout_destination ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <span className="text-sm text-foreground-secondary">Not configured</span>
              )}
              <svg
                className="w-4 h-4 text-foreground-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </div>

      {/* Help section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Help
        </p>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <a href="/how-it-works" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">How It Works</span>
            <svg className="w-4 h-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <div className="h-px bg-border mx-4" />
          <a href="/faq" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">FAQ</span>
            <svg className="w-4 h-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* About section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          About
        </p>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground-secondary">Version</span>
            <span className="text-sm text-foreground font-medium">0.3.0</span>
          </div>
          <div className="h-px bg-border mx-4" />
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground-secondary">Build</span>
            <span className="text-sm text-foreground font-medium">Session 3</span>
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Legal
        </p>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <a href="/privacy" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">Privacy Policy</span>
            <svg className="w-4 h-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <div className="h-px bg-border mx-4" />
          <a href="/terms" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">Terms of Service</span>
            <svg className="w-4 h-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <div className="h-px bg-border mx-4" />
          <a href="/about" className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-foreground">About K33pr</span>
            <svg className="w-4 h-4 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div>
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <form action={signout}>
            <button
              type="submit"
              className="w-full text-left px-4 py-4 text-sm font-medium text-red-500 hover:bg-red-50 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
