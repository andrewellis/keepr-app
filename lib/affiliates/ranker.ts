import type { AffiliateResult } from './types'

/**
 * Deduplicate and rank affiliate results from multiple networks.
 *
 * Dedup rule: same productName (case-insensitive) AND price within 5% = duplicate.
 *   → Keep the one with higher totalReturnCents.
 *
 * Sort: totalReturnCents descending, price ascending on ties.
 */
export function rankResults(results: AffiliateResult[]): AffiliateResult[] {
  // Deduplicate
  const kept: AffiliateResult[] = []

  for (const item of results) {
    const dupeIndex = kept.findIndex((existing) => {
      const sameName =
        existing.productName.toLowerCase() === item.productName.toLowerCase()
      if (!sameName) return false

      const priceDiff = Math.abs(existing.price - item.price)
      const avgPrice = (existing.price + item.price) / 2
      if (avgPrice === 0) return sameName
      return priceDiff / avgPrice <= 0.05
    })

    if (dupeIndex === -1) {
      // No duplicate — add it
      kept.push(item)
    } else {
      // Duplicate found — keep the one with higher totalReturnCents
      if (item.totalReturnCents > kept[dupeIndex].totalReturnCents) {
        kept[dupeIndex] = item
      }
    }
  }

  // Sort: totalReturnCents desc, price asc on ties
  return kept.sort((a, b) => {
    if (b.totalReturnCents !== a.totalReturnCents) {
      return b.totalReturnCents - a.totalReturnCents
    }
    return a.price - b.price
  })
}
