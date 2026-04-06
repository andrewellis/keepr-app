import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import PayoutDestinationForm from './PayoutDestinationForm'

export default async function PayoutSettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const serviceClient = createServiceClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select(
      'payout_destination, payout_destination_type, payout_balance_cents, annual_cash_payout_cents, annual_cash_payout_year, w9_required, w9_on_file'
    )
    .eq('id', user.id)
    .single()

  const balanceCents = profile?.payout_balance_cents ?? 0
  const annualCents = profile?.annual_cash_payout_cents ?? 0
  const annualYear = profile?.annual_cash_payout_year ?? new Date().getFullYear()
  const currentYear = new Date().getFullYear()
  const effectiveAnnualCents = annualYear === currentYear ? annualCents : 0
  const w9Required = profile?.w9_required ?? false
  const w9OnFile = profile?.w9_on_file ?? false
  const payoutDestination = profile?.payout_destination ?? null
  const payoutType = profile?.payout_destination_type ?? null

  const { data: onHoldTxs } = await serviceClient
    .from('transactions')
    .select('user_payout_cents')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .eq('payout_hold_released', false)

  const onHoldCount = onHoldTxs?.length ?? 0
  const onHoldCents = onHoldTxs?.reduce((sum, tx) => sum + (tx.user_payout_cents ?? 0), 0) ?? 0

  const { data: processingPayouts } = await serviceClient
    .from('payouts')
    .select('amount_cents')
    .eq('user_id', user.id)
    .eq('status', 'processing')

  const processingCount = processingPayouts?.length ?? 0
  const processingCents = processingPayouts?.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0) ?? 0

  const { data: completedPayouts } = await serviceClient
    .from('payouts')
    .select('amount_cents')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalEarnedCents = completedPayouts?.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0) ?? 0

  function fmt(cents: number) {
    return '$' + (cents / 100).toFixed(2)
  }

  return (
    <div className="bg-background px-5 pt-12 pb-24">
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

      {w9Required && !w9OnFile && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">W-9 Required</p>
          <p className="text-xs text-yellow-700 leading-relaxed">
            You&apos;ve earned close to $600 this year. The IRS requires a W-9 form before we can send your next payout. Please email your completed W-9 to{' '}
            <a href="mailto:admin@grmtek.com" className="underline font-medium">admin@grmtek.com</a>.
            Payouts will resume after we receive it.
          </p>
        </div>
      )}

      {balanceCents > 0 && !payoutDestination && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-4">
          <p className="text-sm text-amber-800">
            You have a balance of ${(balanceCents / 100).toFixed(2)} but no payout destination set. Add your PayPal email or Venmo phone number below to receive your earnings.
          </p>
        </div>
      )}

      {/* Payout Summary */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          Payout Summary
        </p>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-foreground-secondary">Available balance</p>
              <p className="text-3xl font-bold text-foreground mt-0.5">{fmt(balanceCents)}</p>
              <p className="text-xs text-foreground-secondary mt-1">
                Payouts sent at <span className="font-medium text-foreground">$5.00</span> minimum
              </p>
            </div>
          </div>

          {onHoldCount > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-foreground-secondary">On hold</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{fmt(onHoldCents)}</p>
              <p className="text-xs text-foreground-secondary mt-0.5">
                {onHoldCount} confirmed transaction{onHoldCount !== 1 ? 's' : ''} — held for 90 days pending release
              </p>
            </div>
          )}

          {processingCount > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-foreground-secondary">Processing</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{fmt(processingCents)}</p>
              <p className="text-xs text-foreground-secondary mt-0.5">
                {processingCount} payout{processingCount !== 1 ? 's' : ''} in progress
              </p>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs text-foreground-secondary">Total earned all time</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{fmt(totalEarnedCents)}</p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-xs text-foreground-secondary">Annual cash payouts ({currentYear})</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-border rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (effectiveAnnualCents / 60000) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-foreground-secondary whitespace-nowrap">
                {fmt(effectiveAnnualCents)} of $600
              </p>
            </div>
            <p className="text-xs text-foreground-secondary mt-1">IRS 1099 threshold</p>
          </div>

          <div className="border-t border-border pt-3">
            <Link href="/history" className="text-xs text-primary font-medium hover:underline">
              View full history →
            </Link>
          </div>
        </div>
      </div>

      {/* PayPal / Venmo section */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
          PayPal / Venmo Payout
        </p>
        <div className="bg-surface border border-border rounded-2xl p-5">
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

          <PayoutDestinationForm currentDestination={payoutDestination} balanceCents={balanceCents} />
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
