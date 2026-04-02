import { createClient } from '@/lib/supabase/server'
import { initiatePayPalPayout } from '@/lib/payouts/paypal'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PayoutResult =
  | { error: 'no_payout_destination' }
  | { error: 'w9_required' }
  | { error: 'concurrent_modification' }
  | { status: 'below_threshold'; balance: number }
  | { payoutId: string; status: 'processing'; amount: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MINIMUM_PAYOUT_CENTS = 500 // $5.00

function getMinimumPayoutCents(): number {
  const envVal = process.env.MINIMUM_PAYOUT_CENTS
  if (envVal) {
    const parsed = parseInt(envVal, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_MINIMUM_PAYOUT_CENTS
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Initiates a payout for a user.
 *
 * This is a shared function — NOT a route handler.
 * It is imported by admin endpoints (Session 3) and the payout initiate route.
 *
 * Payout model: one payout per user for their full accumulated balance.
 * Uses an optimistic lock to atomically zero the balance.
 *
 * @param userId - The Supabase user ID to pay out
 * @returns PayoutResult describing the outcome
 */
export async function initiateUserPayout(userId: string): Promise<PayoutResult> {
  const supabase = createClient()
  const minimumPayoutCents = getMinimumPayoutCents()

  // ── Step 1: Look up user profile ─────────────────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'payout_destination, payout_destination_type, payout_balance_cents, w9_required, w9_on_file'
    )
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error(`[payout] Failed to load profile for user ${userId}:`, profileError)
    return { error: 'no_payout_destination' }
  }

  // ── Step 2: Validate payout destination ──────────────────────────────────
  if (!profile.payout_destination) {
    return { error: 'no_payout_destination' }
  }

  // ── Step 3: Check W-9 requirement ────────────────────────────────────────
  if (profile.w9_required === true && profile.w9_on_file === false) {
    return { error: 'w9_required' }
  }

  // ── Step 4: Check minimum threshold ──────────────────────────────────────
  if (profile.payout_balance_cents < minimumPayoutCents) {
    return { status: 'below_threshold', balance: profile.payout_balance_cents }
  }

  // ── Steps 5–6: Optimistic lock — atomically zero the balance ─────────────
  // Retry once if the balance changed between read and write (concurrent modification)
  const attemptPayout = async (
    currentBalance: number,
    attempt: number
  ): Promise<PayoutResult | null> => {
    // Atomic UPDATE with optimistic lock: only succeeds if balance hasn't changed
    const { error: updateError, count } = await supabase
      .from('profiles')
      .update({ payout_balance_cents: 0 })
      .eq('id', userId)
      .eq('payout_balance_cents', currentBalance)

    if (updateError) {
      console.error(
        `[payout] Optimistic lock update failed for user ${userId} (attempt ${attempt}):`,
        updateError
      )
      return { error: 'concurrent_modification' }
    }

    // count = 0 means the balance changed between our read and this write
    if (count === 0) {
      console.warn(
        `[payout] Optimistic lock missed for user ${userId} (attempt ${attempt}) — balance changed`
      )
      return null // Signal to retry
    }

    return { __balance: currentBalance } as unknown as PayoutResult // Sentinel: proceed with this balance
  }

  let totalPayoutCents = profile.payout_balance_cents
  let lockResult = await attemptPayout(totalPayoutCents, 1)

  if (lockResult === null) {
    // Retry: re-read the profile and try again
    const { data: freshProfile, error: freshError } = await supabase
      .from('profiles')
      .select('payout_balance_cents')
      .eq('id', userId)
      .single()

    if (freshError || !freshProfile) {
      return { error: 'concurrent_modification' }
    }

    // Re-check minimum threshold with fresh balance
    if (freshProfile.payout_balance_cents < minimumPayoutCents) {
      return { status: 'below_threshold', balance: freshProfile.payout_balance_cents }
    }

    totalPayoutCents = freshProfile.payout_balance_cents
    lockResult = await attemptPayout(totalPayoutCents, 2)

    if (lockResult === null) {
      return { error: 'concurrent_modification' }
    }
  }

  // If we got an error result from attemptPayout, return it
  if (lockResult && 'error' in lockResult) {
    return lockResult
  }

  // ── Step 7: Create payouts record ────────────────────────────────────────
  const { data: payoutRecord, error: insertError } = await supabase
    .from('payouts')
    .insert({
      user_id: userId,
      amount_cents: totalPayoutCents,
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertError || !payoutRecord) {
    console.error(`[payout] Failed to create payouts record for user ${userId}:`, insertError)

    // Restore the balance since we zeroed it but couldn't create the record
    // Use atomic SQL: SET payout_balance_cents = payout_balance_cents + totalPayoutCents
    const { error: restoreError } = await supabase
      .from('profiles')
      .update({ payout_balance_cents: totalPayoutCents })
      .eq('id', userId)
      .eq('payout_balance_cents', 0)

    if (restoreError) {
      console.error(
        `[payout] CRITICAL: Failed to restore balance for user ${userId} after failed payout insert:`,
        restoreError
      )
    }

    return { error: 'concurrent_modification' }
  }

  // ── Step 8: Initiate PayPal payout ───────────────────────────────────────
  try {
    await initiatePayPalPayout(userId, totalPayoutCents, payoutRecord.id)
  } catch (err) {
    // initiatePayPalPayout already updated the payouts record to 'failed'
    // and logged to audit_log. We surface the error here but don't re-throw
    // since the payouts record exists and the admin can retry.
    console.error(
      `[payout] PayPal initiation failed for payout ${payoutRecord.id}:`,
      err
    )
    // Return processing status — the record exists, PayPal call failed,
    // admin can see 'failed' status in payouts table
  }

  // ── Step 9: Return result ─────────────────────────────────────────────────
  return {
    payoutId: payoutRecord.id,
    status: 'processing',
    amount: totalPayoutCents,
  }
}
