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

  function cleanDomain(domain: string | undefined | null): string {
    if (!domain) return ''
    return domain.replace(/\.\w+$/, '')
  }

  function buildPickReason(e: typeof scored[0]): string {
    let reason = ''
    if (e.result.rating) {
      reason += '★ ' + e.result.rating
    }
    if (e.result.reviews) {
      reason += (reason ? ' ' : '') + '(' + e.result.reviews.toLocaleString() + ' reviews)'
    }
    const deliveryLower = (e.result.delivery ?? []).map(d => d.toLowerCase())
    if (deliveryLower.some(d => d.includes('free'))) {
      reason += (reason ? ' · ' : '') + 'Free shipping'
    }
    if (getRetailerTrust(e.result.retailerDomain) === 'major') {
      reason += (reason ? ' · ' : '') + 'Trusted retailer'
    }
    if (!reason) {
      reason = cleanDomain(e.result.retailerDomain)
    }
    return reason
  }

  const cheapestLabel = 'Lowest Price'
  const cheapestReason = '$' + cheapestEntry.netCost.toFixed(2) + ' total · ' + cleanDomain(cheapestEntry.result.retailerDomain)

  const pickLabel = 'Best Overall'
  const pickReason = buildPickReason(pickEntry)

  const premiumLabel = 'Premium Pick'
  const premiumReason = premiumEntry ? buildPickReason(premiumEntry) : ''

  return {
    cheapest: { ...cheapestEntry.result, netCost: cheapestEntry.netCost, label: cheapestLabel, reason: cheapestReason },
    pick: { ...pickEntry.result, netCost: pickEntry.netCost, label: pickLabel, reason: pickReason },
    premium: premiumEntry ? { ...premiumEntry.result, netCost: premiumEntry.netCost, label: premiumLabel, reason: premiumReason } : null,
  }
}
