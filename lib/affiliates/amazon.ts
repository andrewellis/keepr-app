import { calculatePayout } from './calculator'
import { getAffiliateRate } from './rateTable'

export interface MatchResult {
  retailer: 'Amazon'
  productName: string
  priceCents: number
  affiliateRate: number
  commissionCents: number
  userPayoutCents: number
  estimatedCashbackCents: number
  totalReturnCents: number
  affiliateUrl: string
  productUrl: string
  imageUrl: string | null
}

export async function searchAmazon(
  searchTerms: string[],
  category: string,
  cashbackRate: number = 0.05
): Promise<MatchResult[]> {
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

  const results: MatchResult[] = mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: 'Amazon' as const,
      productName: p.productName,
      priceCents: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: `https://www.amazon.com/dp/${p.asin}?tag=${tag}`,
      productUrl: `https://www.amazon.com/dp/${p.asin}?tag=${tag}`,
      imageUrl: p.imageUrl,
    }
  })

  return results.sort((a, b) =>
    b.totalReturnCents !== a.totalReturnCents
      ? b.totalReturnCents - a.totalReturnCents
      : a.priceCents - b.priceCents
  )
}
