import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { initiateUserPayout } from '@/lib/payouts/initiate'

const DEFAULT_MINIMUM_PAYOUT_CENTS = 500

function getMinimumPayoutCents(): number {
  const envVal = process.env.MINIMUM_PAYOUT_CENTS
  if (envVal) {
    const parsed = parseInt(envVal, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_MINIMUM_PAYOUT_CENTS
}

interface PayoutDetail {
  userId: string
  status: string
  amountCents?: number
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const minimumPayoutCents = getMinimumPayoutCents()

    // ── Step 2: Query eligible profiles ──────────────────────────────────
    // payout_balance_cents >= minimum
    // payout_destination IS NOT NULL
    // w9_required = false OR w9_on_file = true
    const { data: eligibleProfiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, payout_balance_cents')
      .gte('payout_balance_cents', minimumPayoutCents)
      .not('payout_destination', 'is', null)
      .or('w9_required.eq.false,w9_on_file.eq.true')

    if (queryError) {
      console.error('[batch-payout] Failed to query eligible profiles:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Step 3: If no eligible users, return early ───────────────────────
    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return NextResponse.json({
        processed: 0,
        paid: 0,
        failed: 0,
        belowThreshold: 0,
        blocked: 0,
        details: [],
      })
    }

    // ── Steps 4–6: Process each user sequentially ────────────────────────
    let paid = 0
    let failed = 0
    let belowThreshold = 0
    let blocked = 0
    const details: PayoutDetail[] = []

    for (const profile of eligibleProfiles) {
      try {
        const result = await initiateUserPayout(profile.id)

        if ('status' in result && result.status === 'processing') {
          paid++
          details.push({
            userId: profile.id,
            status: 'processing',
            amountCents: result.amount,
          })
        } else if ('status' in result && result.status === 'below_threshold') {
          belowThreshold++
          details.push({
            userId: profile.id,
            status: 'below_threshold',
          })
        } else if ('error' in result) {
          if (
            result.error === 'no_payout_destination' ||
            result.error === 'w9_required'
          ) {
            blocked++
            details.push({
              userId: profile.id,
              status: 'blocked',
              error: result.error,
            })
          } else {
            failed++
            details.push({
              userId: profile.id,
              status: 'failed',
              error: result.error,
            })
          }
        }
      } catch (err) {
        failed++
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error(
          `[batch-payout] Error processing user ${profile.id}:`,
          err
        )
        details.push({
          userId: profile.id,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    // ── Step 7: Return summary ───────────────────────────────────────────
    return NextResponse.json({
      processed: eligibleProfiles.length,
      paid,
      failed,
      belowThreshold,
      blocked,
      details,
    })
  } catch (err) {
    console.error('[batch-payout] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
