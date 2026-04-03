import { NextRequest, NextResponse } from 'next/server'
import { validateAdminAuth } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/service'

interface PayoutCheckResult {
  payoutId: string
  previousStatus: string
  newStatus?: string
  amountCents?: number
  reason?: string
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Validate admin auth ──────────────────────────────────────
    if (!validateAdminAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse optional body ──────────────────────────────────────────────
    let body: { payoutId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // No body is fine — we'll check all processing payouts
    }

    const supabase = createServiceClient()

    // ── Step 2: Query payouts ────────────────────────────────────────────
    let query = supabase
      .from('payouts')
      .select('*')
      .eq('status', 'processing')

    if (body.payoutId) {
      query = query.eq('id', body.payoutId)
    }

    const { data: payouts, error: queryError } = await query

    if (queryError) {
      console.error('[check-payout-status] Failed to query payouts:', queryError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Step 3: Filter to payouts with paypal_batch_id ───────────────────
    const paypalPayouts = (payouts || []).filter(
      (p) => p.paypal_batch_id
    )

    if (paypalPayouts.length === 0) {
      // Check if PayPal credentials are configured
      if (!process.env.PAYPAL_CLIENT_ID) {
        return NextResponse.json({
          checked: 0,
          message: 'PayPal credentials not configured',
        })
      }
      return NextResponse.json({ checked: 0, results: [] })
    }

    // ── Step 4a: Get PayPal OAuth token (once) ───────────────────────────
    if (!process.env.PAYPAL_CLIENT_ID) {
      return NextResponse.json({
        checked: 0,
        message: 'PayPal credentials not configured',
      })
    }

    const paypalBase =
      process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com'
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64')

    const tokenResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('[check-payout-status] Failed to get PayPal access token:', errorBody)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken: string = tokenData.access_token

    // ── Step 4b–c: Check each payout ─────────────────────────────────────
    const results: PayoutCheckResult[] = []

    for (const payout of paypalPayouts) {
      try {
        const statusResponse = await fetch(
          `${paypalBase}/v1/payments/payouts/${payout.paypal_batch_id}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!statusResponse.ok) {
          const errorBody = await statusResponse.text()
          console.error(
            `[check-payout-status] PayPal API error for payout ${payout.id}:`,
            errorBody
          )
          results.push({
            payoutId: payout.id,
            previousStatus: 'processing',
            error: `PayPal API error: HTTP ${statusResponse.status}`,
          })
          continue
        }

        const statusData = await statusResponse.json()
        const batchStatus: string =
          statusData?.batch_header?.batch_status ?? 'UNKNOWN'

        if (batchStatus === 'SUCCESS') {
          // Update payout to completed
          await supabase
            .from('payouts')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', payout.id)

          // 1099 tracking: update annual_cash_payout_cents on user profile
          const amountCents = payout.amount_cents as number
          const userId = payout.user_id as string

          const { data: profile } = await supabase
            .from('profiles')
            .select('annual_cash_payout_cents')
            .eq('id', userId)
            .single()

          if (profile) {
            const currentAnnual = profile.annual_cash_payout_cents as number
            const newAnnual = currentAnnual + amountCents
            const updatePayload: Record<string, unknown> = {
              annual_cash_payout_cents: newAnnual,
            }
            if (newAnnual >= 58000) {
              updatePayload.w9_required = true
            }
            await supabase
              .from('profiles')
              .update(updatePayload)
              .eq('id', userId)
          }

          // Log to audit_log
          await supabase.from('audit_log').insert({
            event_type: 'payout_completed',
            user_id: payout.user_id,
            related_id: payout.id,
            metadata: {
              payout_id: payout.id,
              amount_cents: amountCents,
              paypal_batch_id: payout.paypal_batch_id,
            },
          })

          results.push({
            payoutId: payout.id,
            previousStatus: 'processing',
            newStatus: 'completed',
            amountCents,
          })
        } else if (batchStatus === 'DENIED' || batchStatus === 'CANCELED') {
          // Update payout to failed
          await supabase
            .from('payouts')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: batchStatus,
            })
            .eq('id', payout.id)

          // Restore amount to user's payout_balance_cents (optimistic lock, one retry)
          const amountCents = payout.amount_cents as number
          const userId = payout.user_id as string

          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('payout_balance_cents')
            .eq('id', userId)
            .single()

          if (currentProfile) {
            const currentBalance = currentProfile.payout_balance_cents as number
            const { count } = await supabase
              .from('profiles')
              .update({ payout_balance_cents: currentBalance + amountCents })
              .eq('id', userId)
              .eq('payout_balance_cents', currentBalance)

            if (count === 0) {
              // Retry once
              const { data: freshProfile } = await supabase
                .from('profiles')
                .select('payout_balance_cents')
                .eq('id', userId)
                .single()

              if (freshProfile) {
                const freshBalance = freshProfile.payout_balance_cents as number
                await supabase
                  .from('profiles')
                  .update({ payout_balance_cents: freshBalance + amountCents })
                  .eq('id', userId)
                  .eq('payout_balance_cents', freshBalance)
              }
            }
          }

          // Log to audit_log
          await supabase.from('audit_log').insert({
            event_type: 'payout_failed_restored',
            user_id: payout.user_id,
            related_id: payout.id,
            metadata: {
              payout_id: payout.id,
              amount_cents: amountCents,
              reason: batchStatus,
            },
          })

          results.push({
            payoutId: payout.id,
            previousStatus: 'processing',
            newStatus: 'failed',
            amountCents,
            reason: batchStatus,
          })
        } else {
          // PENDING, PROCESSING, or other — no changes
          results.push({
            payoutId: payout.id,
            previousStatus: 'processing',
            newStatus: 'processing',
          })
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        console.error(
          `[check-payout-status] Error checking payout ${payout.id}:`,
          err
        )
        results.push({
          payoutId: payout.id,
          previousStatus: 'processing',
          error: `PayPal API error: ${errorMessage}`,
        })
      }
    }

    // ── Step 5: Return results ───────────────────────────────────────────
    return NextResponse.json({
      checked: paypalPayouts.length,
      results,
    })
  } catch (err) {
    console.error('[check-payout-status] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
