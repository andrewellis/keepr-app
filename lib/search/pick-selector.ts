import type { SerpResult } from './serp-multi-search'
import { getRetailerTrust } from './retailer-trust'

export interface PickSet {
  cheapest: SerpResult & { netCost: number; label: string; reason: string };
  pick: SerpResult & { netCost: number; label: string; reason: string };
  premium: (SerpResult & { netCost: number; label: string; reason: string }) | null;
}

export function selectPicks(
  results: SerpResult[],
  cardRecs: Record<string, { rate: number } | null>
): PickSet | null {
  const priced = results.filter(r => r.price !== null)
  if (priced.length < 2) return null

  const enriched = priced.map(result => {
    const id = `${result.engine}-${result.url}`
    const cardRate = cardRecs[id]?.rate ?? 0
    const netCost = result.price! * (1 - cardRate / 100)
    return { result, id, cardRate, netCost }
  })

  const minNet = Math.min(...enriched.map(e => e.netCost))
  const maxNet = Math.max(...enriched.map(e => e.netCost))

  const scored = enriched.map(e => {
    const { result, cardRate, netCost } = e

    const priceScore = maxNet === minNet ? 100 : 100 - ((netCost - minNet) / (maxNet - minNet)) * 100

    const trustScore = getRetailerTrust(result.retailerDomain) === 'major' ? 85 : 30

    let deliveryScore = 20
    if (result.delivery && result.delivery.length > 0) {
      const deliveryLower = result.delivery.map(d => d.toLowerCase())
      if (deliveryLower.some(d => d.includes('2-day') || d.includes('next-day'))) {
        deliveryScore = 100
      } else if (deliveryLower.some(d => d.includes('free'))) {
        deliveryScore = 80
      } else {
        deliveryScore = 40
      }
    }

    const ratingScore = result.rating ? result.rating * 20 : 50
    const cashbackScore = cardRate * 20
    const composite =
      priceScore * 0.35 +
      trustScore * 0.25 +
      deliveryScore * 0.15 +
      ratingScore * 0.15 +
      cashbackScore * 0.10

    return { result, netCost, priceScore, trustScore, deliveryScore, ratingScore, cashbackScore, composite }
  })

  const sortedByComposite = [...scored].sort((a, b) => b.composite - a.composite)
  const bestComposite = sortedByComposite[0]

  const sortedByNetCost = [...scored].sort((a, b) => a.netCost - b.netCost)
  const absoluteCheapest = sortedByNetCost[0]

  let pickEntry: typeof scored[0]
  let cheapestEntry: typeof scored[0]

  if (bestComposite.result === absoluteCheapest.result) {
    pickEntry = bestComposite
    cheapestEntry = sortedByNetCost[1]
  } else {
    pickEntry = bestComposite
    cheapestEntry = absoluteCheapest
  }

  const remaining = scored.filter(e => e.result !== cheapestEntry.result && e.result !== pickEntry.result)
  let premiumEntry: typeof scored[0] | null = null
  for (const e of remaining) {
    if (getRetailerTrust(e.result.retailerDomain) === 'major') {
      if (
        premiumEntry === null ||
        (e.trustScore + e.deliveryScore) > (premiumEntry.trustScore + premiumEntry.deliveryScore)
      ) {
        premiumEntry = e
      }
    }
  }

  function hasFreeShipping(entry: typeof scored[0]): boolean {
    return (entry.result.delivery ?? []).some(d => d.toLowerCase().includes('free'))
  }

  function buildCheapestReason(entry: typeof scored[0], scoredArr: typeof scored): string {
    let reason = 'Lowest price found'
    if (scoredArr.length >= 3) {
      reason += ` across ${scoredArr.length} results`
    }
    const avg = scoredArr.reduce((sum, e) => sum + e.netCost, 0) / scoredArr.length
    const delta = avg - entry.netCost
    if (delta >= 1) {
      reason += ` · $${delta.toFixed(2)} below average`
    }
    if (hasFreeShipping(entry)) {
      reason += ' · Free shipping'
    }
    if (entry.result.rating) {
      reason += ` · ★${entry.result.rating}`
    }
    return reason
  }

  function buildPickReason(entry: typeof scored[0], scoredArr: typeof scored): string {
    const isMajor = getRetailerTrust(entry.result.retailerDomain) === 'major'
    let reason = isMajor
      ? 'Best value from a trusted retailer'
      : 'Best combination of price, trust, and shipping'
    if (hasFreeShipping(entry)) {
      reason += ' · Free shipping'
    }
    if (entry.result.rating && entry.result.reviews && entry.result.rating >= 4.0 && entry.result.reviews >= 100) {
      reason += ` · ★${entry.result.rating} from ${entry.result.reviews.toLocaleString()} reviews`
    } else if (entry.result.rating) {
      reason += ` · ★${entry.result.rating}`
    }
    const sortedByCost = [...scoredArr].sort((a, b) => a.netCost - b.netCost)
    const rank = sortedByCost.findIndex(e => e.result === entry.result) + 1
    if (rank <= 3 && scoredArr.length >= 5) {
      reason += ' · Top 3 lowest price'
    }
    return reason
  }

  function buildPremiumReason(entry: typeof scored[0], scoredArr: typeof scored): string {
    let reason = entry.result.rating && entry.result.rating >= 4.5
      ? 'Highest rated option from a major retailer'
      : 'Top-rated at a major retailer'
    if (hasFreeShipping(entry)) {
      reason += ' · Free shipping'
    }
    if (entry.result.rating && entry.result.reviews) {
      reason += ` · ★${entry.result.rating} (${entry.result.reviews.toLocaleString()} reviews)`
    }
    const cheapestNetCost = Math.min(...scoredArr.map(e => e.netCost))
    const delta = entry.netCost - cheapestNetCost
    if (delta > 0) {
      reason += ` · $${delta.toFixed(2)} more than lowest price`
    }
    return reason
  }

  const cheapestLabel = 'Lowest Price'
  const cheapestReason = buildCheapestReason(cheapestEntry, scored)

  const pickLabel = 'Best Overall'
  const pickReason = buildPickReason(pickEntry, scored)

  const premiumLabel = 'Premium Pick'
  const premiumReason = premiumEntry ? buildPremiumReason(premiumEntry, scored) : ''

  return {
    cheapest: { ...cheapestEntry.result, netCost: cheapestEntry.netCost, label: cheapestLabel, reason: cheapestReason },
    pick: { ...pickEntry.result, netCost: pickEntry.netCost, label: pickLabel, reason: pickReason },
    premium: premiumEntry ? { ...premiumEntry.result, netCost: premiumEntry.netCost, label: premiumLabel, reason: premiumReason } : null,
  }
}
