'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Record a scan event. Inserts a new transaction row with status 'scanned'.
 * Returns the new row's id, or null on error.
 */
export async function recordScan(
  userId: string,
  productName: string | null,
  category: string | null,
  scanImageUrl: string | null
): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      product_name: productName,
      category: category,
      scan_image_url: scanImageUrl,
      status: 'scanned',
    })
    .select('id')
    .single()

  if (error) {
    console.error('recordScan error:', error)
    return null
  }

  return data?.id ?? null
}

/**
 * Record a click event.
 * - If transactionId is provided, updates the existing row with retailer/affiliate info and sets status = 'clicked'.
 * - If transactionId is null, inserts a new row with status 'clicked'.
 */
export async function recordClick(
  userId: string,
  transactionId: string | null,
  retailer: string,
  affiliateUrl: string,
  affiliateRate: number,
  userPayoutCents: number
): Promise<void> {
  const supabase = createClient()

  if (transactionId) {
    const { error } = await supabase
      .from('transactions')
      .update({
        retailer,
        affiliate_url: affiliateUrl,
        affiliate_rate: affiliateRate,
        user_payout_cents: userPayoutCents,
        status: 'clicked',
      })
      .eq('id', transactionId)
      .eq('user_id', userId)

    if (error) {
      console.error('recordClick (update) error:', error)
    }
  } else {
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        retailer,
        affiliate_url: affiliateUrl,
        affiliate_rate: affiliateRate,
        user_payout_cents: userPayoutCents,
        status: 'clicked',
      })

    if (error) {
      console.error('recordClick (insert) error:', error)
    }
  }
}
