export interface AffiliateResult {
  retailer: string
  productName: string
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

export type AffiliateSearchFn = (
  searchTerms: string[],
  category: string,
  cashbackRate: number
) => Promise<AffiliateResult[]>
