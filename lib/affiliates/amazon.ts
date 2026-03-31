import { calculatePayout } from './calculator'
import { getAffiliateRate } from './rateTable'
import type { AffiliateResult, AffiliateSearchFn } from './types'

/**
 * @deprecated Use AffiliateResult from './types' instead.
 * Kept for backward compatibility with ScanClient.tsx
 */
export interface MatchResult {
  retailer: string
  productName: string
  priceCents: number
  price: number
  affiliateRate: number
  commissionCents: number
  userPayoutCents: number
  estimatedCashbackCents: number
  totalReturnCents: number
  affiliateUrl: string
  productUrl: string
  imageUrl: string | null
  inStock: boolean
}

export const searchAmazon: AffiliateSearchFn = async (
  searchTerms,
  category,
  cashbackRate = 0.05
) => {
  const affiliateRate = getAffiliateRate(category)
  const tag = process.env.AMAZON_ASSOCIATE_TAG ?? 'k33pr-20'

  // TODO: Replace mock block below with real PA-API calls once approved
  const searchLabel = searchTerms[0] ?? 'Product'
  const mockProducts = [
    {
      asin: 'B0CHWWXKZQ',
      productName: `${searchLabel} — Option A`,
      priceCents: 2499,
      imageUrl: null as string | null,
    },
    {
      asin: 'B09NQKX7ZP',
      productName: `${searchLabel} — Option B`,
      priceCents: 2299,
      imageUrl: null as string | null,
    },
    {
      asin: 'B0BT3YNKQR',
      productName: `${searchLabel} — Option C`,
      priceCents: 1999,
      imageUrl: null as string | null,
    },
  ]

  const results: AffiliateResult[] = mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: 'Amazon',
      productName: p.productName,
      price: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: `https://www.amazon.com/dp/${p.asin}?tag=${tag}`,
      productUrl: `https://www.amazon.com/dp/${p.asin}?tag=${tag}`,
      imageUrl: p.imageUrl,
      inStock: true,
    }
  })

  return results.sort((a, b) =>
    b.totalReturnCents !== a.totalReturnCents
      ? b.totalReturnCents - a.totalReturnCents
      : a.price - b.price
  )
}
