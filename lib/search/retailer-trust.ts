export type RetailerTrust = 'major' | 'unknown'

const MAJOR_RETAILERS = new Set<string>([
  'amazon.com',
  'walmart.com',
  'bestbuy.com',
  'target.com',
  'costco.com',
  'homedepot.com',
  'lowes.com',
  'newegg.com',
  'bhphotovideo.com',
  'macys.com',
  'nordstrom.com',
  'ebay.com',
])

export function getRetailerTrust(domain: string): RetailerTrust {
  const normalized = domain.replace(/^www\./, '')
  return MAJOR_RETAILERS.has(normalized) ? 'major' : 'unknown'
}
