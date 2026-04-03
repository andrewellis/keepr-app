import { createServiceClient as createClient } from '@/lib/supabase/service'

/**
 * Initiates a PayPal Payout for a user.
 *
 * IMPORTANT: PayPal Payouts is ASYNCHRONOUS.
 * A 201 response means the batch was ACCEPTED, NOT that funds were delivered.
 * Status is set to 'processing' on 201, never 'completed'.
 *
 * If PAYPAL_CLIENT_ID is not set, falls back to 'pending_manual' status
 * (graceful degradation for dev/testing without PayPal credentials).
 *
 * @param userId - The user's Supabase ID
 * @param amountCents - The payout amount in cents
 * @param payoutId - The payouts table record ID (used as sender_batch_id and sender_item_id)
 */
export async function initiatePayPalPayout(
  userId: string,
  amountCents: number,
  payoutId: string
): Promise<void> {
  const supabase = createClient()

  // ── Graceful fallback: no PayPal credentials configured ──────────────────
  if (!process.env.PAYPAL_CLIENT_ID) {
    console.warn(
      `[paypal] PAYPAL_CLIENT_ID not set — marking payout ${payoutId} as pending_manual`
    )

    await supabase
      .from('payouts')
      .update({ status: 'pending_manual' })
      .eq('id', payoutId)

    await supabase.from('audit_log').insert({
      event_type: 'payout_manual_required',
      user_id: userId,
      related_id: payoutId,
      metadata: {
        reason: 'PAYPAL_CLIENT_ID not configured',
        amount_cents: amountCents,
      },
    })

    return
  }

  const paypalBase = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com'

  // ── Step 1: Get OAuth access token ───────────────────────────────────────
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
    console.error(`[paypal] Failed to get access token for payout ${payoutId}:`, errorBody)

    await supabase.from('payouts').update({ status: 'failed' }).eq('id', payoutId)

    await supabase.from('audit_log').insert({
      event_type: 'payout_failed',
      user_id: userId,
      related_id: payoutId,
      metadata: {
        stage: 'oauth_token',
        error: errorBody,
        amount_cents: amountCents,
      },
    })

    throw new Error(`PayPal OAuth failed: ${errorBody}`)
  }

  const tokenData = await tokenResponse.json()
  const accessToken: string = tokenData.access_token

  // ── Step 2: Look up payout destination ───────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('payout_destination, payout_destination_type')
    .eq('id', userId)
    .single()

  if (profileError || !profile?.payout_destination) {
    const errorMsg = profileError?.message ?? 'No payout_destination on profile'
    console.error(`[paypal] Cannot find payout destination for user ${userId}:`, errorMsg)

    await supabase.from('payouts').update({ status: 'failed' }).eq('id', payoutId)

    await supabase.from('audit_log').insert({
      event_type: 'payout_failed',
      user_id: userId,
      related_id: payoutId,
      metadata: {
        stage: 'lookup_destination',
        error: errorMsg,
        amount_cents: amountCents,
      },
    })

    throw new Error(`PayPal payout failed: ${errorMsg}`)
  }

  // ── Step 3: Determine recipient_type ─────────────────────────────────────
  const recipientType =
    profile.payout_destination_type === 'phone' ? 'PHONE' : 'EMAIL'

  // ── Step 4: Create PayPal Payout ─────────────────────────────────────────
  const payoutBody = {
    sender_batch_header: {
      sender_batch_id: payoutId,
      email_subject: 'Your K33pr payout',
    },
    items: [
      {
        recipient_type: recipientType,
        amount: {
          value: (amountCents / 100).toFixed(2),
          currency: 'USD',
        },
        receiver: profile.payout_destination,
        note: 'K33pr affiliate payout',
        sender_item_id: payoutId,
      },
    ],
  }

  const payoutResponse = await fetch(`${paypalBase}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payoutBody),
  })

  if (payoutResponse.status === 201) {
    // Batch accepted — NOT yet delivered. Set to 'processing'.
    const payoutData = await payoutResponse.json()
    const batchId: string =
      payoutData?.batch_header?.payout_batch_id ?? payoutData?.batch_payout_batch_id ?? null

    console.log(
      `[paypal] Payout batch accepted for payout ${payoutId}, PayPal batch_id=${batchId}`
    )

    await supabase
      .from('payouts')
      .update({
        paypal_batch_id: batchId,
        status: 'processing',
      })
      .eq('id', payoutId)
  } else {
    // HTTP error from PayPal
    const errorBody = await payoutResponse.text()
    console.error(
      `[paypal] Payout creation failed for payout ${payoutId} (HTTP ${payoutResponse.status}):`,
      errorBody
    )

    await supabase.from('payouts').update({ status: 'failed' }).eq('id', payoutId)

    await supabase.from('audit_log').insert({
      event_type: 'payout_failed',
      user_id: userId,
      related_id: payoutId,
      metadata: {
        stage: 'create_payout',
        http_status: payoutResponse.status,
        error: errorBody,
        amount_cents: amountCents,
      },
    })

    throw new Error(`PayPal payout creation failed (HTTP ${payoutResponse.status}): ${errorBody}`)
  }
}
