import type { SerpResult } from './serp-multi-search'
import { getRetailerTrust } from './retailer-trust'

export interface PickSet {
  cheapest: SerpResult & { netCost: number }
  pick: SerpResult & { netCost: number }
  premium: (SerpResult & { netCost: number }) | null
  reasonText: string
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

  const cheapestEntry = scored.reduce((a, b) => a.netCost <= b.netCost ? a : b)

  const sortedByComposite = [...scored].sort((a, b) => b.composite - a.composite)
  let pickEntry = sortedByComposite[0]
  if (pickEntry.result === cheapestEntry.result) {
    pickEntry = sortedByComposite[1]
  }

  const remaining = scored.filter(e => e.result !== cheapestEntry.result && e.result !== pickEntry.result)
  let premiumEntry: typeof scored[0] | null = null
  if (remaining.length > 0) {
    premiumEntry = remaining.reduce((a, b) =>
      (a.trustScore + a.deliveryScore) >= (b.trustScore + b.deliveryScore) ? a : b
    )
  }

  const pickName = pickEntry.result.retailerDomain ? pickEntry.result.retailerDomain.replace(/\.\w+$/, '') : (pickEntry.result.seller ?? 'this retailer')
  const cheapestName = cheapestEntry.result.retailerDomain ? cheapestEntry.result.retailerDomain.replace(/\.\w+$/, '') : (cheapestEntry.result.seller ?? 'the cheapest option')

  let reasonText = 'Why ' + pickName + '? '

  if (pickEntry.netCost > cheapestEntry.netCost) {
    reasonText += 'Only $' + (pickEntry.netCost - cheapestEntry.netCost).toFixed(2) + ' more than ' + cheapestName + ', but '
  }

  const pickDeliveryLower = (pickEntry.result.delivery ?? []).map(d => d.toLowerCase())
  if (pickDeliveryLower.some(d => d.includes('free'))) {
    reasonText += 'free shipping'
  }

  if (getRetailerTrust(pickEntry.result.retailerDomain) === 'major') {
    reasonText += ' from a trusted retailer'
  }

  if (pickEntry.result.rating) {
    reasonText += ' with ★ ' + pickEntry.result.rating
  }

  if (pickEntry.result.reviews) {
    reasonText += ' from ' + pickEntry.result.reviews.toLocaleString() + ' reviews'
  }

  reasonText += '.'

  return {
    cheapest: { ...cheapestEntry.result, netCost: cheapestEntry.netCost },
    pick: { ...pickEntry.result, netCost: pickEntry.netCost },
    premium: premiumEntry ? { ...premiumEntry.result, netCost: premiumEntry.netCost } : null,
    reasonText,
  }
}
