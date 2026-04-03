import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // ── Step 2: Query eligible transactions ──────────────────────────────
    const { data: eligible, error: queryError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'confirmed')
      .eq('commission_status', 'confirmed')
      .eq('payout_hold_released', false)
      .lte('payout_held_until', now)

    if (queryError) {
      console.error('[release-holds] Failed to query eligible transactions:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Step 3: If none found, return early ──────────────────────────────
    if (!eligible || eligible.length === 0) {
      return NextResponse.json({
        released: 0,
        totalCentsReleased: 0,
        skippedReversed: 0,
        details: [],
      })
    }

    // ── Step 4: Group by user_id ─────────────────────────────────────────
    type Transaction = (typeof eligible)[number]
    const byUser: Record<string, Transaction[]> = {}
    for (const tx of eligible) {
      const uid = tx.user_id as string
      if (!byUser[uid]) {
        byUser[uid] = []
      }
      byUser[uid].push(tx)
    }

    // ── Step 5: Process each user ────────────────────────────────────────
    let totalTransactionsReleased = 0
    let sumOfAllPayoutCents = 0
    const details: { userId: string; transactionsReleased: number; amountCents: number }[] = []
    const userIds = Object.keys(byUser)

    for (const userId of userIds) {
      const transactions = byUser[userId]
      // 5a. Sum user_payout_cents
      const totalCents = transactions.reduce(
        (sum: number, tx: Transaction) => sum + ((tx.user_payout_cents as number) || 0),
        0
      )

      // 5b. Atomically increment payout_balance_cents with optimistic lock
      if (totalCents > 0) {
        const { data: currentProfile, error: readError } = await supabase
          .from('profiles')
          .select('payout_balance_cents')
          .eq('id', userId)
          .single()

        if (readError || !currentProfile) {
          console.error(
            `[release-holds] Failed to read profile for user ${userId}:`,
            readError
          )
          continue
        }

        const currentBalance = currentProfile.payout_balance_cents as number
        const { count, error: updateError } = await supabase
          .from('profiles')
          .update({ payout_balance_cents: currentBalance + totalCents })
          .eq('id', userId)
          .eq('payout_balance_cents', currentBalance)

        if (updateError) {
          console.error(
            `[release-holds] Failed to update balance for user ${userId}:`,
            updateError
          )
          continue
        }

        // If count = 0 (concurrent modification), retry once
        if (count === 0) {
          console.warn(
            `[release-holds] Optimistic lock missed for user ${userId} — retrying`
          )
          const { data: freshProfile, error: freshError } = await supabase
            .from('profiles')
            .select('payout_balance_cents')
            .eq('id', userId)
            .single()

          if (freshError || !freshProfile) {
            console.error(
              `[release-holds] Retry: failed to read profile for user ${userId}:`,
              freshError
            )
            continue
          }

          const freshBalance = freshProfile.payout_balance_cents as number
          const { error: retryError, count: retryCount } = await supabase
            .from('profiles')
            .update({ payout_balance_cents: freshBalance + totalCents })
            .eq('id', userId)
            .eq('payout_balance_cents', freshBalance)

          if (retryError || retryCount === 0) {
            console.error(
              `[release-holds] Retry failed for user ${userId}:`,
              retryError
            )
            continue
          }
        }
      }

      // 5c. Mark each transaction as released
      for (const tx of transactions) {
        await supabase
          .from('transactions')
          .update({ payout_hold_released: true })
          .eq('id', tx.id)

        // 5d. Log to audit_log
        await supabase.from('audit_log').insert({
          event_type: 'payout_hold_released',
          user_id: userId,
          related_id: tx.click_id,
          metadata: {
            click_id: tx.click_id,
            user_id: userId,
            user_payout_cents: tx.user_payout_cents,
          },
        })
      }

      totalTransactionsReleased += transactions.length
      sumOfAllPayoutCents += totalCents
      details.push({
        userId,
        transactionsReleased: transactions.length,
        amountCents: totalCents,
      })
    }

    // ── Step 6: Return summary ───────────────────────────────────────────
    return NextResponse.json({
      released: totalTransactionsReleased,
      totalCentsReleased: sumOfAllPayoutCents,
      skippedReversed: 0,
      details,
    })
  } catch (err) {
    console.error('[release-holds] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
