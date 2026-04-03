import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // ── Step 2a: Transaction counts by status ────────────────────────────
    const countByStatus = async (status: string) => {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return count ?? 0
    }

    const [pending, clicked, confirmed, processing, completed, failed] =
      await Promise.all([
        countByStatus('pending'),
        countByStatus('clicked'),
        countByStatus('confirmed'),
        countByStatus('processing'),
        countByStatus('completed'),
        countByStatus('failed'),
      ])

    // ── Step 2b: Total confirmed commissions ─────────────────────────────
    const { data: confirmedTxs } = await supabase
      .from('transactions')
      .select('commission_cents')
      .eq('commission_status', 'confirmed')

    const totalConfirmedCommissionCents = (confirmedTxs ?? []).reduce(
      (sum: number, tx: { commission_cents: number | null }) =>
        sum + ((tx.commission_cents as number) ?? 0),
      0
    )

    // ── Step 2c: Total payouts completed ─────────────────────────────────
    const { data: completedPayouts } = await supabase
      .from('payouts')
      .select('amount_cents')
      .eq('status', 'completed')

    const totalPayoutsCompletedCents = (completedPayouts ?? []).reduce(
      (sum: number, p: { amount_cents: number | null }) =>
        sum + ((p.amount_cents as number) ?? 0),
      0
    )

    // ── Step 2d: Users approaching 1099 threshold ────────────────────────
    const { count: usersApproaching1099 } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('annual_cash_payout_cents', 50000)

    // ── Step 2e: Holds expiring in next 7 days ───────────────────────────
    const now = new Date().toISOString()
    const sevenDays = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { count: holdsExpiringNext7Days } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .eq('payout_hold_released', false)
      .gte('payout_held_until', now)
      .lte('payout_held_until', sevenDays)

    // ── Step 2f: Pending payouts (processing status) ─────────────────────
    const { data: processingPayouts } = await supabase
      .from('payouts')
      .select('amount_cents')
      .eq('status', 'processing')

    const processingPayoutsCount = processingPayouts?.length ?? 0
    const processingPayoutsTotalCents = (processingPayouts ?? []).reduce(
      (sum: number, p: { amount_cents: number | null }) =>
        sum + ((p.amount_cents as number) ?? 0),
      0
    )

    // ── Step 2g: Recent fraud flags ──────────────────────────────────────
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: fraudFlags, count: fraudCount } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('event_type', 'fraud_flag')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    // ── Step 3: Return dashboard data ────────────────────────────────────
    return NextResponse.json({
      transactions: {
        pending,
        clicked,
        confirmed,
        processing,
        completed,
        failed,
      },
      totalConfirmedCommissionCents,
      totalPayoutsCompletedCents,
      usersApproaching1099: usersApproaching1099 ?? 0,
      holdsExpiringNext7Days: holdsExpiringNext7Days ?? 0,
      processingPayouts: {
        count: processingPayoutsCount,
        totalCents: processingPayoutsTotalCents,
      },
      recentFraudFlags: {
        count: fraudCount ?? 0,
        latest: fraudFlags ?? [],
      },
    })
  } catch (err) {
    console.error('[dashboard] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
