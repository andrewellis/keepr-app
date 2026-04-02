import type { AffiliateResult } from '@/lib/affiliates/types'
import { appendClickIdToUrl } from '@/lib/clicks/network-params'
import { createClient } from '@/lib/supabase/server'

// ─── Affiliate Network Map ────────────────────────────────────────────────────
// Maps retailer name (or parenthetical suffix) to affiliate_network value stored in DB.
// For unmapped retailers: NULL.
const AFFILIATE_NETWORK_MAP: Record<string, string> = {
  Amazon: 'Amazon Associates',
  // CJ retailers
  Nike: 'CJ',
  Adidas: 'CJ',
  // Impact retailers
  Target: 'Impact',
  // Rakuten retailers
  "Macy's": 'Rakuten',
  Nordstrom: 'Rakuten',
  // Awin retailers
  ASOS: 'Awin',
}

/**
 * Derives the affiliate_network value from a retailer name.
 * Handles both exact matches and parenthetical suffixes like "Nike (CJ)".
 */
function deriveAffiliateNetwork(retailer: string): string | null {
  // Exact match first
  if (AFFILIATE_NETWORK_MAP[retailer]) {
    return AFFILIATE_NETWORK_MAP[retailer]
  }

  // Try to match by parenthetical network suffix: "Nike (CJ)" → "CJ"
  const parenMatch = retailer.match(/\(([^)]+)\)$/)
  if (parenMatch) {
    const networkSuffix = parenMatch[1].trim()
    // Map network suffix to full name
    const networkNames: Record<string, string> = {
      CJ: 'CJ',
      Impact: 'Impact',
      Rakuten: 'Rakuten',
      Awin: 'Awin',
    }
    if (networkNames[networkSuffix]) {
      return networkNames[networkSuffix]
    }
  }

  // Try to match base retailer name (before parenthetical)
  const baseName = retailer.replace(/\s*\([^)]+\)$/, '').trim()
  if (AFFILIATE_NETWORK_MAP[baseName]) {
    return AFFILIATE_NETWORK_MAP[baseName]
  }

  return null
}

// ─── Click ID Generation ──────────────────────────────────────────────────────

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomAlphanumeric(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return result
}

/**
 * Generates a Click ID in the format: K3P-{8chars}-{unix_timestamp}-{6chars}
 *
 * For logged-in users: first 8 chars of Supabase user ID (hyphens stripped from UUID)
 * For anonymous users: 8 random alphanumeric characters
 *
 * Example: K3P-A3F9C2B1-1711234567-X7K2M9
 */
export function generateClickId(userId: string | null): string {
  let userPart: string
  if (userId) {
    // Strip hyphens from UUID and take first 8 chars
    userPart = userId.replace(/-/g, '').substring(0, 8).toUpperCase()
  } else {
    userPart = randomAlphanumeric(8)
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const randomPart = randomAlphanumeric(6)

  return `K3P-${userPart}-${timestamp}-${randomPart}`
}

// ─── Attach Click IDs ─────────────────────────────────────────────────────────

export type AffiliateResultWithClickId = AffiliateResult & { clickId: string }

/**
 * For each affiliate result:
 * 1. Generates a unique Click ID
 * 2. Appends the Click ID to the affiliate URL using the correct network parameter
 * 3. Inserts a transaction record into the database BEFORE returning the result
 * 4. If the DB insert fails, excludes that result from the returned array
 *
 * CRITICAL: Never returns a link without a corresponding database record.
 */
export async function attachClickIds(
  results: AffiliateResult[],
  userId: string | null,
  requestIp: string,
  requestUserAgent: string
): Promise<AffiliateResultWithClickId[]> {
  const supabase = createClient()
  const output: AffiliateResultWithClickId[] = []

  for (const result of results) {
    const clickId = generateClickId(userId)
    const modifiedUrl = appendClickIdToUrl(result.affiliateUrl, result.retailer, clickId)
    const affiliateNetwork = deriveAffiliateNetwork(result.retailer)

    // Insert transaction record BEFORE adding to output
    const { error } = await supabase.from('transactions').insert({
      click_id: clickId,
      user_id: userId ?? null,
      product_name: result.productName,
      retailer: result.retailer,
      product_url: result.productUrl ?? result.affiliateUrl,
      affiliate_url: modifiedUrl,
      commission_rate: result.affiliateRate,
      commission_cents: result.commissionCents ?? 0,
      price_cents: result.price ?? 0,
      user_payout_cents: result.userPayoutCents,
      status: 'generated',
      affiliate_network: affiliateNetwork,
      link_url: modifiedUrl,
      created_ip: requestIp,
      user_agent: requestUserAgent,
      commission_status: 'unconfirmed',
      payout_held_until: null,
      payout_hold_released: false,
    })

    if (error) {
      console.error(
        `[clicks] Failed to insert transaction for click_id=${clickId} retailer=${result.retailer}:`,
        error
      )
      console.error('[clicks] Insert payload:', JSON.stringify({
        click_id: clickId,
        product_name: result.productName,
        retailer: result.retailer,
        product_url: result.productUrl,
        commission_rate: result.affiliateRate,
        commission_cents: result.commissionCents,
        price_cents: result.price,
        user_payout_cents: result.userPayoutCents,
      }))
      // CRITICAL: Do not return this link — no DB record means no tracking
      continue
    }

    output.push({
      ...result,
      affiliateUrl: modifiedUrl,
      clickId,
    })
  }

  return output
}
