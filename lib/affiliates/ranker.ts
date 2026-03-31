import type { AffiliateResult } from './types'

/**
 * Deduplicate and rank affiliate results from multiple networks.
 *
 * Dedup rule: same productName (case-insensitive) AND same retailer = duplicate.
 *   → Keep the one with higher totalReturnCents.
 *   (When prices are known and differ by >5%, both are kept.)
 *
 * Sort: Amazon first (only real affiliate link), then alphabetically by retailer.
 * When real prices are available (price > 0), falls back to totalReturnCents desc,
 * price asc on ties.
 */
export function rankResults(results: AffiliateResult[]): AffiliateResult[] {
  // Deduplicate
  const kept: AffiliateResult[] = []

  for (const item of results) {
    const dupeIndex = kept.findIndex((existing) => {
      const sameName =
        existing.productName.toLowerCase() === item.productName.toLowerCase()
      if (!sameName) return false

      // If both prices are 0 (search links), same name = duplicate
      if (existing.price === 0 && item.price === 0) {
        return existing.retailer === item.retailer
      }

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

  // Sort: if all prices are 0 (search-link mode), sort Amazon first then
  // alphabetically by retailer name. Otherwise use totalReturnCents desc.
  const allSearchLinks = kept.every((r) => r.price === 0)

  if (allSearchLinks) {
    return kept.sort((a, b) => {
      const aIsAmazon = a.retailer === 'Amazon' ? 0 : 1
      const bIsAmazon = b.retailer === 'Amazon' ? 0 : 1
      if (aIsAmazon !== bIsAmazon) return aIsAmazon - bIsAmazon
      return a.retailer.localeCompare(b.retailer)
    })
  }

  return kept.sort((a, b) => {
    if (b.totalReturnCents !== a.totalReturnCents) {
      return b.totalReturnCents - a.totalReturnCents
    }
    return a.price - b.price
  })
}
