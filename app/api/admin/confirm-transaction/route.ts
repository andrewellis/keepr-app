import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: Parse body ───────────────────────────────────────────────
    let body: {
      clickId?: string
      confirmedCommissionCents?: number
      purchaseAmountCents?: number
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { clickId, confirmedCommissionCents, purchaseAmountCents } = body

    if (!clickId) {
      return NextResponse.json({ error: 'clickId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── Step 3: Look up transaction by click_id ──────────────────────────
    const { data: transaction, error: lookupError } = await supabase
      .from('transactions')
      .select('*')
      .eq('click_id', clickId)
      .single()

    if (lookupError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // ── Step 4: Status guard ─────────────────────────────────────────────
    if (transaction.status !== 'clicked') {
      return NextResponse.json(
        { error: 'Transaction must be in clicked status', currentStatus: transaction.status },
        { status: 409 }
      )
    }

    // ── Step 5: Determine final commission ───────────────────────────────
    const finalCommission =
      confirmedCommissionCents !== undefined
        ? confirmedCommissionCents
        : (transaction.commission_cents as number)

    const userPayoutCents = Math.max(finalCommission - 20, 0)

    // ── Step 6: Year rollover check ──────────────────────────────────────
    const currentYear = new Date().getFullYear()
    const userId = transaction.user_id as string

    const { data: profile } = await supabase
      .from('profiles')
      .select('annual_cash_payout_year')
      .eq('id', userId)
      .single()

    if (profile && profile.annual_cash_payout_year !== currentYear) {
      const previousYear = profile.annual_cash_payout_year

      await supabase
        .from('profiles')
        .update({
          annual_cash_payout_cents: 0,
          annual_cash_payout_year: currentYear,
          w9_required: false,
        })
        .eq('id', userId)

      await supabase.from('audit_log').insert({
        event_type: 'tax_year_rollover',
        user_id: userId,
        metadata: { previous_year: previousYear, new_year: currentYear },
      })
    }

    // ── Step 7: Update the transaction ───────────────────────────────────
    const now = new Date()
    const payoutHeldUntil = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    ).toISOString()

    const updatePayload: Record<string, unknown> = {
      status: 'confirmed',
      commission_status: 'confirmed',
      confirmed_at: now.toISOString(),
      payout_held_until: payoutHeldUntil,
      payout_hold_released: false,
      user_payout_cents: userPayoutCents,
    }

    if (confirmedCommissionCents !== undefined) {
      updatePayload.commission_cents = confirmedCommissionCents
    }

    if (purchaseAmountCents !== undefined) {
      updatePayload.purchase_amount = purchaseAmountCents / 100
    }

    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('click_id', clickId)
      .select('*')
      .single()

    if (updateError || !updatedTransaction) {
      console.error('[confirm-transaction] Failed to update transaction:', updateError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Step 8: Fraud detection checks (log-only) ────────────────────────

    // 8a. IP frequency: count transactions with same IP in last 60 minutes
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: ipCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('created_ip', transaction.created_ip)
      .gte('created_at', oneHourAgo)

    if (ipCount !== null && ipCount > 10) {
      await supabase.from('audit_log').insert({
        event_type: 'fraud_flag',
        user_id: userId,
        metadata: {
          reason: 'high_ip_frequency',
          ip: transaction.created_ip,
          count: ipCount,
          click_id: transaction.click_id,
        },
      })
    }

    // 8b. Fast purchase: seconds between transaction creation and now
    const createdAtMs = new Date(transaction.created_at).getTime()
    const secondsElapsed = Math.floor((Date.now() - createdAtMs) / 1000)

    if (secondsElapsed < 30) {
      await supabase.from('audit_log').insert({
        event_type: 'fraud_flag',
        user_id: userId,
        metadata: {
          reason: 'fast_purchase',
          seconds_elapsed: secondsElapsed,
          click_id: transaction.click_id,
        },
      })
    }

    // 8c. User volume: transactions created today (UTC)
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const { count: userDayCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())

    if (userDayCount !== null && userDayCount > 50) {
      await supabase.from('audit_log').insert({
        event_type: 'fraud_flag',
        user_id: userId,
        metadata: {
          reason: 'high_generation_volume',
          count: userDayCount,
          user_id: userId,
        },
      })
    }

    // ── Step 9: Log confirmation to audit_log ────────────────────────────
    await supabase.from('audit_log').insert({
      event_type: 'transaction_confirmed',
      user_id: userId,
      related_id: transaction.click_id,
      metadata: {
        click_id: transaction.click_id,
        user_payout_cents: userPayoutCents,
        commission_cents: finalCommission,
        hold_release_date: payoutHeldUntil,
      },
    })

    // ── Step 10: Return updated transaction ──────────────────────────────
    return NextResponse.json(updatedTransaction)
  } catch (err) {
    console.error('[confirm-transaction] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
