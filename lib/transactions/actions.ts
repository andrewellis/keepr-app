'use server'

import { createClient } from '@/lib/supabase/server'

export async function recordScan(
  _userId: string,
  _productName: string | null,
  _category: string | null,
  _scanImageUrl: string | null
): Promise<string | null> {
  return null
}

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
        commission_rate: affiliateRate,
        user_payout_cents: userPayoutCents,
        status: 'clicked',
      })
      .eq('id', transactionId)
      .eq('user_id', userId)

    if (error) {
      console.error('recordClick (update) error:', error)
    }
  } else {
    console.warn('[recordClick] No transactionId provided — skipping insert. attachClickIds should have created the record.')
  }
}
