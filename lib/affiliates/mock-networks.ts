import { calculatePayout } from './calculator'
import type { AffiliateResult, AffiliateSearchFn } from './types'

/**
 * Mock affiliate network implementations.
 * Each checks for its env var (or MOCK_AFFILIATES=true) before returning data.
 * When real API integrations are built, these will be replaced with actual calls.
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

  const mockProducts = [
    {
      productName: `${label} — Nike via CJ`,
      priceCents: 5999,
      url: 'https://www.nike.com/mock-product-cj',
      imageUrl: null as string | null,
    },
    {
      productName: `${label} — Adidas via CJ`,
      priceCents: 4999,
      url: 'https://www.adidas.com/mock-product-cj',
      imageUrl: null as string | null,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: p.url.includes('adidas') ? 'Adidas (CJ)' : 'Nike (CJ)',
      productName: p.productName,
      price: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: p.imageUrl,
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

  const mockProducts = [
    {
      productName: `${label} — Target via Impact`,
      priceCents: 3499,
      url: 'https://www.target.com/mock-product-impact',
      imageUrl: null as string | null,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: 'Target (Impact)',
      productName: p.productName,
      price: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: p.imageUrl,
      inStock: true,
    } satisfies AffiliateResult
  })
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

  const mockProducts = [
    {
      productName: `${label} — Macy's via Rakuten`,
      priceCents: 4299,
      url: 'https://www.macys.com/mock-product-rakuten',
      imageUrl: null as string | null,
    },
    {
      productName: `${label} — Nordstrom via Rakuten`,
      priceCents: 6499,
      url: 'https://www.nordstrom.com/mock-product-rakuten',
      imageUrl: null as string | null,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: p.productName.includes("Macy") ? "Macy's (Rakuten)" : 'Nordstrom (Rakuten)',
      productName: p.productName,
      price: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: p.imageUrl,
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

  const mockProducts = [
    {
      productName: `${label} — ASOS via Awin`,
      priceCents: 3899,
      url: 'https://www.asos.com/mock-product-awin',
      imageUrl: null as string | null,
    },
  ]

  return mockProducts.map((p) => {
    const payout = calculatePayout(p.priceCents, affiliateRate, cashbackRate)
    return {
      retailer: 'ASOS (Awin)',
      productName: p.productName,
      price: p.priceCents,
      affiliateRate,
      commissionCents: payout.commissionCents,
      userPayoutCents: payout.userPayoutCents,
      estimatedCashbackCents: payout.estimatedCashbackCents,
      totalReturnCents: payout.totalReturnCents,
      affiliateUrl: p.url,
      productUrl: p.url,
      imageUrl: p.imageUrl,
      inStock: true,
    } satisfies AffiliateResult
  })
}
