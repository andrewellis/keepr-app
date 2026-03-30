export interface PayoutResult {
  commissionCents: number
  processingFeeCents: number
  userPayoutCents: number
  estimatedCashbackCents: number
  totalReturnCents: number
}

export function calculatePayout(
  priceCents: number,
  affiliateRate: number,
  cashbackRate: number
): PayoutResult {
  const commissionCents = Math.floor(priceCents * affiliateRate)
  const processingFeeCents = 20
  const userPayoutCents = Math.max(0, commissionCents - processingFeeCents)
  const estimatedCashbackCents = Math.floor(priceCents * cashbackRate)
  const totalReturnCents = userPayoutCents + estimatedCashbackCents
  return { commissionCents, processingFeeCents, userPayoutCents, estimatedCashbackCents, totalReturnCents }
}
