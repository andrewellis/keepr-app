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

    // ── Step 2: Query payouts needing attention ──────────────────────────
    const { data: payouts, error: queryError } = await supabase
      .from('payouts')
      .select('*')
      .in('status', ['processing', 'pending_manual', 'failed'])
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[pending-payouts] Failed to query payouts:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!payouts || payouts.length === 0) {
      return NextResponse.json({ payouts: [] })
    }

    // ── Step 3: Enrich with profile destination info ─────────────────────
    // Collect unique user IDs
    const userIds = Array.from(new Set(payouts.map((p) => p.user_id as string)))

    // Fetch profiles for all users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, payout_destination, payout_destination_type')
      .in('id', userIds)

    const profileMap: Record<string, { destination: string | null; destinationType: string | null }> = {}
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = {
          destination: p.payout_destination,
          destinationType: p.payout_destination_type,
        }
      }
    }

    // ── Step 4: Build response ───────────────────────────────────────────
    const result = payouts.map((payout) => {
      const profile = profileMap[payout.user_id as string]
      return {
        id: payout.id,
        userId: payout.user_id,
        amountCents: payout.amount_cents,
        status: payout.status,
        destination: (payout.destination as string | null) ?? profile?.destination ?? null,
        destinationType: (payout.destination_type as string | null) ?? profile?.destinationType ?? null,
        paypalBatchId: payout.paypal_batch_id ?? null,
        createdAt: payout.created_at,
        failedAt: payout.failed_at ?? null,
        failureReason: payout.failure_reason ?? null,
      }
    })

    return NextResponse.json({ payouts: result })
  } catch (err) {
    console.error('[pending-payouts] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
