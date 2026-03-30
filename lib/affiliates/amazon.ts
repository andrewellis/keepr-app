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

const CASHBACK_RATE = 0.05

export async function searchAmazon(searchTerms: string[], category: string): Promise<MatchResult[]> {
  const affiliateRate = getAffiliateRate(category)

  // TODO: Replace mock block below with real PA-API calls once approved
  const mockProducts: { asin: string; productName: string; priceCents: number; imageUrl: string }[] = [
    {
      asin: 'B0CHWWXKZQ',
      productName: 'Velo Nicotine Pouches Freeze 11mg — 5-Pack',
      priceCents: 2499,
      imageUrl: 'https://m.media-amazon.com/images/I/61Q2vBqFMIL._AC_SL1500_.jpg',
    },
    {
      asin: 'B09NQKX7ZP',
      productName: 'ZYN Nicotine Pouches Cool Mint 6mg — 5-Pack',
      priceCents: 2299,
      imageUrl: 'https://m.media-amazon.com/images/I/71kXnWZJS5L._AC_SL1500_.jpg',
    },
    {
      asin: 'B0BT3YNKQR',
      productName: 'Nordic Spirit Nicotine Pouches Spearmint — 20 Pouches',
      priceCents: 1999,
      imageUrl: 'https://m.media-amazon.com/images/I/61mFnSmNURL._AC_SL1500_.jpg',
    },
  ]

  const results: MatchResult[] = mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, CASHBACK_RATE)
    return {
      retailer: 'Amazon',
      productName: p.productName,
      priceCents: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: `https://www.amazon.com/dp/${p.asin}?tag=grmtek-20`,
      productUrl: `https://www.amazon.com/dp/${p.asin}?tag=grmtek-20`,
      imageUrl: p.imageUrl,
    }
  })

  return results.sort((a, b) =>
    b.totalReturnCents !== a.totalReturnCents
      ? b.totalReturnCents - a.totalReturnCents
      : a.priceCents - b.priceCents
  )
}
