import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PayoutDestinationForm from './PayoutDestinationForm'

export default async function PayoutSettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('payout_destination, payout_destination_type, payout_balance_cents')
    .eq('id', user.id)
    .single()

  const balanceCents = profile?.payout_balance_cents ?? 0
  const balanceDollars = (balanceCents / 100).toFixed(2)
  const payoutDestination = profile?.payout_destination ?? null
  const payoutType = profile?.payout_destination_type ?? null

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

      {/* Balance card */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-1">
          Available Balance
        </p>
        <p className="text-3xl font-bold text-foreground">${balanceDollars}</p>
        <p className="text-xs text-foreground-secondary mt-2">
          Payouts are sent when your balance reaches{' '}
          <span className="font-medium text-foreground">$5.00</span>.
        </p>
      </div>

      {/* PayPal / Venmo section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          PayPal / Venmo Payout
        </p>
        <div className="bg-surface border border-border rounded-2xl p-5">
          {/* Connected indicator */}
          {payoutDestination && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-700">PayPal/Venmo connected</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {payoutType === 'email'
                    ? payoutDestination
                    : `+1 (${payoutDestination.slice(0, 3)}) ${payoutDestination.slice(3, 6)}-${payoutDestination.slice(6)}`}
                </p>
              </div>
            </div>
          )}

          <PayoutDestinationForm currentDestination={payoutDestination} />
        </div>
      </div>

      {/* Info note */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <p className="text-xs text-foreground-secondary leading-relaxed">
          <span className="font-medium text-foreground">How payouts work:</span> When your K33pr
          balance reaches $5.00, we send your earnings via PayPal. If your email or phone number
          is linked to Venmo, you&apos;ll receive it there automatically. Payouts are processed
          within 90 days of a confirmed purchase.
        </p>
      </div>
    </div>
  )
}
