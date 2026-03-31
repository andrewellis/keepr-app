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

  // TODO: Replace with real PA-API calls once approved.
  // For now, generate an Amazon search URL using the product's search terms.
  // This is a valid Amazon Associates affiliate link — any purchase within
  // 24 hours of clicking earns the commission. No PA-API required.
  const searchLabel = searchTerms[0] ?? 'Product'
  const searchQuery = searchTerms.join('+')
  const affiliateUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=${tag}`

  // Price is unknown for search links — set to 0
  const priceCents = 0
  const payout = calculatePayout(priceCents, affiliateRate, cashbackRate)

  const result: AffiliateResult = {
    retailer: 'Amazon',
    productName: searchLabel,
    price: priceCents,
    affiliateRate,
    commissionCents: payout.commissionCents,
    userPayoutCents: payout.userPayoutCents,
    estimatedCashbackCents: payout.estimatedCashbackCents,
    totalReturnCents: payout.totalReturnCents,
    affiliateUrl,
    productUrl: affiliateUrl,
    imageUrl: null,
    inStock: true,
  }

  return [result]
}
