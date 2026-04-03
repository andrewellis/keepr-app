import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { initiateUserPayout } from '@/lib/payouts/initiate'

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: Parse body ───────────────────────────────────────────────
    let body: { userId?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { userId } = body
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // ── Step 3–4: Call initiateUserPayout ─────────────────────────────────
    const result = await initiateUserPayout(userId)

    // ── Step 5: Map result to HTTP response ──────────────────────────────
    if ('error' in result) {
      switch (result.error) {
        case 'no_payout_destination':
          return NextResponse.json(
            { error: 'User has no payout destination configured' },
            { status: 400 }
          )
        case 'w9_required':
          return NextResponse.json(
            { error: 'User must submit W-9 before payout' },
            { status: 400 }
          )
        case 'concurrent_modification':
          return NextResponse.json(
            { error: 'Concurrent modification — retry' },
            { status: 409 }
          )
      }
    }

    if ('status' in result && result.status === 'below_threshold') {
      return NextResponse.json({
        status: 'below_threshold',
        balanceCents: result.balance,
      })
    }

    if ('status' in result && result.status === 'processing') {
      return NextResponse.json({
        status: 'processing',
        payoutId: result.payoutId,
        amountCents: result.amount,
      })
    }

    // Fallback — shouldn't happen but handle defensively
    return NextResponse.json(result)
  } catch (err) {
    console.error('[trigger-payout] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
