import { describe, it, expect } from 'vitest'
import { rankResults } from '../ranker'
import type { AffiliateResult } from '../types'

/** Helper to build a minimal AffiliateResult for testing */
function makeResult(overrides: Partial<AffiliateResult>): AffiliateResult {
  return {
    retailer: 'TestRetailer',
    productName: 'Test Product',
    price: 10000,
    affiliateRate: 0.05,
    commissionCents: 500,
    userPayoutCents: 480,
    estimatedCashbackCents: 500,
    totalReturnCents: 980,
    affiliateUrl: 'https://example.com/product',
    productUrl: 'https://example.com/product',
    imageUrl: null,
    inStock: true,
    ...overrides,
  }
}

describe('rankResults', () => {
  it('deduplicates same name (case-insensitive) within 5% price, keeping higher totalReturnCents', () => {
    const results: AffiliateResult[] = [
      makeResult({
        productName: 'NIKE AIR MAX 90',
        price: 11999, // $119.99
        totalReturnCents: 600,
        affiliateUrl: 'https://a.com/1',
      }),
      makeResult({
        productName: 'Nike Air Max 90',
        price: 12200, // $122.00 — within 5% of $119.99
        totalReturnCents: 750,
        affiliateUrl: 'https://b.com/2',
      }),
    ]

    const ranked = rankResults(results)

    // Should deduplicate to 1 result
    expect(ranked).toHaveLength(1)
    // Should keep the one with higher totalReturnCents (750)
    expect(ranked[0].totalReturnCents).toBe(750)
    expect(ranked[0].affiliateUrl).toBe('https://b.com/2')
  })

  it('does NOT deduplicate same name when prices differ by more than 5%', () => {
    const results: AffiliateResult[] = [
      makeResult({
        productName: 'Nike Air Max 90',
        price: 11999, // $119.99
        totalReturnCents: 600,
        affiliateUrl: 'https://a.com/1',
      }),
      makeResult({
        productName: 'Nike Air Max 90',
        price: 13000, // $130.00 — more than 5% apart from $119.99
        totalReturnCents: 750,
        affiliateUrl: 'https://b.com/2',
      }),
    ]

    const ranked = rankResults(results)

    // Should keep both results
    expect(ranked).toHaveLength(2)
  })

  it('sorts by totalReturnCents desc, then price asc on ties', () => {
    const results: AffiliateResult[] = [
      makeResult({
        productName: 'Product A',
        price: 5000,
        totalReturnCents: 300,
        affiliateUrl: 'https://a.com/1',
      }),
      makeResult({
        productName: 'Product B',
        price: 8000,
        totalReturnCents: 500,
        affiliateUrl: 'https://b.com/2',
      }),
      makeResult({
        productName: 'Product C',
        price: 6000,
        totalReturnCents: 500, // tie with Product B
        affiliateUrl: 'https://c.com/3',
      }),
      makeResult({
        productName: 'Product D',
        price: 9000,
        totalReturnCents: 200,
        affiliateUrl: 'https://d.com/4',
      }),
    ]

    const ranked = rankResults(results)

    expect(ranked).toHaveLength(4)
    // First: totalReturnCents 500, lower price (6000) wins tie
    expect(ranked[0].productName).toBe('Product C')
    expect(ranked[0].totalReturnCents).toBe(500)
    expect(ranked[0].price).toBe(6000)
    // Second: totalReturnCents 500, higher price (8000)
    expect(ranked[1].productName).toBe('Product B')
    expect(ranked[1].totalReturnCents).toBe(500)
    expect(ranked[1].price).toBe(8000)
    // Third: totalReturnCents 300
    expect(ranked[2].productName).toBe('Product A')
    expect(ranked[2].totalReturnCents).toBe(300)
    // Fourth: totalReturnCents 200
    expect(ranked[3].productName).toBe('Product D')
    expect(ranked[3].totalReturnCents).toBe(200)
  })

  it('returns empty array for empty input', () => {
    expect(rankResults([])).toEqual([])
  })

  it('returns single result unchanged', () => {
    const single = makeResult({ productName: 'Solo Product' })
    const ranked = rankResults([single])
    expect(ranked).toHaveLength(1)
    expect(ranked[0].productName).toBe('Solo Product')
  })

  // ─── Search-link mode (price = 0) ──────────────────────────────────────────

  it('search-link mode: sorts Amazon first, then alphabetically by retailer', () => {
    const results: AffiliateResult[] = [
      makeResult({
        retailer: 'Nike (CJ)',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://nike.com/s?q=nike+air+max+90',
        productUrl: 'https://nike.com/s?q=nike+air+max+90',
      }),
      makeResult({
        retailer: 'Amazon',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
        productUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
      }),
      makeResult({
        retailer: 'Adidas (CJ)',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://adidas.com/us/search?q=nike+air+max+90',
        productUrl: 'https://adidas.com/us/search?q=nike+air+max+90',
      }),
    ]

    const ranked = rankResults(results)

    expect(ranked).toHaveLength(3)
    // Amazon should be first
    expect(ranked[0].retailer).toBe('Amazon')
    // Then alphabetically: Adidas (CJ) before Nike (CJ)
    expect(ranked[1].retailer).toBe('Adidas (CJ)')
    expect(ranked[2].retailer).toBe('Nike (CJ)')
  })

  it('search-link mode: deduplicates same retailer + same name, keeps one', () => {
    const results: AffiliateResult[] = [
      makeResult({
        retailer: 'Amazon',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
        productUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
      }),
      makeResult({
        retailer: 'Amazon',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
        productUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
      }),
    ]

    const ranked = rankResults(results)

    expect(ranked).toHaveLength(1)
    expect(ranked[0].retailer).toBe('Amazon')
  })

  it('search-link mode: does NOT deduplicate same name across different retailers', () => {
    const results: AffiliateResult[] = [
      makeResult({
        retailer: 'Amazon',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
        productUrl: 'https://amazon.com/s?k=nike+air+max+90&tag=k33pr-20',
      }),
      makeResult({
        retailer: 'Nike (CJ)',
        productName: 'Nike Air Max 90',
        price: 0,
        totalReturnCents: 0,
        affiliateUrl: 'https://nike.com/w?q=nike+air+max+90',
        productUrl: 'https://nike.com/w?q=nike+air+max+90',
      }),
    ]

    const ranked = rankResults(results)

    // Different retailers — both should be kept
    expect(ranked).toHaveLength(2)
    expect(ranked[0].retailer).toBe('Amazon')
    expect(ranked[1].retailer).toBe('Nike (CJ)')
  })
})
