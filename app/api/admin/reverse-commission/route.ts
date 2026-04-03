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
    let body: { clickId?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { clickId } = body
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
    if (transaction.commission_status !== 'confirmed') {
      return NextResponse.json(
        {
          error: 'Commission is not in confirmed status',
          currentStatus: transaction.commission_status,
        },
        { status: 409 }
      )
    }

    const userId = transaction.user_id as string
    const holdWasReleased = transaction.payout_hold_released as boolean

    // ── Step 5: Update the transaction ───────────────────────────────────
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        commission_status: 'reversed',
        status: 'failed',
      })
      .eq('click_id', clickId)
      .select('*')
      .single()

    if (updateError || !updatedTransaction) {
      console.error('[reverse-commission] Failed to update transaction:', updateError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Step 6: Check payout_hold_released ───────────────────────────────
    if (holdWasReleased) {
      await supabase.from('audit_log').insert({
        event_type: 'reversal_after_release',
        user_id: userId,
        related_id: clickId,
        metadata: {
          click_id: clickId,
          user_id: userId,
          user_payout_cents: transaction.user_payout_cents,
          warning: 'balance_already_released_requires_manual_review',
        },
      })

      // Still log the commission_reversed event (step 7)
      await supabase.from('audit_log').insert({
        event_type: 'commission_reversed',
        user_id: userId,
        related_id: clickId,
        metadata: {
          click_id: clickId,
          user_payout_cents: transaction.user_payout_cents,
          hold_was_released: holdWasReleased,
        },
      })

      return NextResponse.json({
        warning: 'payout_already_released',
        requiresManualReview: true,
        transaction: updatedTransaction,
      })
    }

    // ── Step 7: Log commission reversal to audit_log ─────────────────────
    await supabase.from('audit_log').insert({
      event_type: 'commission_reversed',
      user_id: userId,
      related_id: clickId,
      metadata: {
        click_id: clickId,
        user_payout_cents: transaction.user_payout_cents,
        hold_was_released: holdWasReleased,
      },
    })

    // ── Step 8: Return updated transaction ───────────────────────────────
    return NextResponse.json(updatedTransaction)
  } catch (err) {
    console.error('[reverse-commission] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
