import type { AffiliateSearchFn } from './types'
import { searchAmazon } from './amazon'
import { searchCJ, searchImpact, searchRakuten, searchAwin } from './mock-networks'

/**
 * Returns all currently active affiliate network search functions
 * based on configured environment variables.
 */
export function getActiveNetworks(): AffiliateSearchFn[] {
  const networks: AffiliateSearchFn[] = []

  // Amazon is always included when its tag/key is configured
  if (process.env.AMAZON_ASSOCIATE_TAG || process.env.AMAZON_ACCESS_KEY) {
    networks.push(searchAmazon)
  }

  const mockEnabled = process.env.MOCK_AFFILIATES === 'true'

  // CJ — enabled with real key or mock mode
  if (process.env.CJ_API_KEY || mockEnabled) {
    networks.push(searchCJ)
  }

  // Impact — enabled with real key or mock mode
  if (process.env.IMPACT_ACCOUNT_SID || mockEnabled) {
    networks.push(searchImpact)
  }

  // Rakuten — enabled with real key or mock mode
  if (process.env.RAKUTEN_API_KEY || mockEnabled) {
    networks.push(searchRakuten)
  }

  // Awin — enabled with real key or mock mode
  if (process.env.AWIN_API_KEY || mockEnabled) {
    networks.push(searchAwin)
  }

  return networks
}
