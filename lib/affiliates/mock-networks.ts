import { calculatePayout } from './calculator'
import type { AffiliateResult, AffiliateSearchFn } from './types'

/**
 * Mock affiliate network implementations.
 * Each checks for its env var (or MOCK_AFFILIATES=true) before returning data.
 * When real API integrations are built, these will be replaced with actual calls.
 *
 * NOTE: These use real retailer search URLs so buttons go to working pages,
 * but affiliate tracking won't work until we have approved network accounts.
 * Amazon is the only one with a real affiliate tag right now.
 */

function isMockEnabled(): boolean {
  return process.env.MOCK_AFFILIATES === 'true'
}

// ─── CJ (Commission Junction) ───────────────────────────────────────────────

export const searchCJ: AffiliateSearchFn = async (
  searchTerms,
  _category,
  cashbackRate = 0.05
) => {
  if (!process.env.CJ_API_KEY && !isMockEnabled()) return []

  const label = searchTerms[0] ?? 'Product'
  const affiliateRate = 0.05
  const priceCents = 0
  const searchQuery = encodeURIComponent(searchTerms.join(' '))

  const mockProducts = [
    {
      retailer: 'Nike (CJ)',
      productName: label,
      url: `https://www.nike.com/w?q=${searchQuery}`,
    },
    {
      retailer: 'Adidas (CJ)',
      productName: label,
      url: `https://www.adidas.com/us/search?q=${searchQuery}`,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(priceCents, affiliateRate, cashbackRate)
    return {
      retailer: p.retailer,
      productName: p.productName,
      price: priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: null,
      inStock: true,
    } satisfies AffiliateResult
  })
}

// ─── Impact ──────────────────────────────────────────────────────────────────

export const searchImpact: AffiliateSearchFn = async (
  searchTerms,
  _category,
  cashbackRate = 0.05
) => {
  if (!process.env.IMPACT_ACCOUNT_SID && !isMockEnabled()) return []

  const label = searchTerms[0] ?? 'Product'
  const affiliateRate = 0.07
  const priceCents = 0
  const searchQuery = encodeURIComponent(searchTerms.join(' '))

  const payout = calculatePayout(priceCents, affiliateRate, cashbackRate)

  return [
    {
      retailer: 'Target (Impact)',
      productName: label,
      price: priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: `https://www.target.com/s?searchTerm=${searchQuery}`,
      productUrl: `https://www.target.com/s?searchTerm=${searchQuery}`,
      imageUrl: null,
      inStock: true,
    } satisfies AffiliateResult,
  ]
}

// ─── Rakuten ─────────────────────────────────────────────────────────────────

export const searchRakuten: AffiliateSearchFn = async (
  searchTerms,
  _category,
  cashbackRate = 0.05
) => {
  if (!process.env.RAKUTEN_API_KEY && !isMockEnabled()) return []

  const label = searchTerms[0] ?? 'Product'
  const affiliateRate = 0.04
  const priceCents = 0
  const searchQuery = encodeURIComponent(searchTerms.join(' '))

  const mockProducts = [
    {
      retailer: "Macy's (Rakuten)",
      productName: label,
      url: `https://www.macys.com/shop/search?keyword=${searchQuery}`,
    },
    {
      retailer: 'Nordstrom (Rakuten)',
      productName: label,
      url: `https://www.nordstrom.com/sr?keyword=${searchQuery}`,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(priceCents, affiliateRate, cashbackRate)
    return {
      retailer: p.retailer,
      productName: p.productName,
      price: priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: null,
      inStock: true,
    } satisfies AffiliateResult
  })
}

// ─── Awin ────────────────────────────────────────────────────────────────────

export const searchAwin: AffiliateSearchFn = async (
  searchTerms,
  _category,
  cashbackRate = 0.05
) => {
  if (!process.env.AWIN_API_KEY && !isMockEnabled()) return []

  const label = searchTerms[0] ?? 'Product'
  const affiliateRate = 0.06
  const priceCents = 0
  const searchQuery = encodeURIComponent(searchTerms.join(' '))

  const payout = calculatePayout(priceCents, affiliateRate, cashbackRate)

  return [
    {
      retailer: 'ASOS (Awin)',
      productName: label,
      price: priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: `https://www.asos.com/us/search/?q=${searchQuery}`,
      productUrl: `https://www.asos.com/us/search/?q=${searchQuery}`,
      imageUrl: null,
      inStock: true,
    } satisfies AffiliateResult,
  ]
}
