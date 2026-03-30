const RATES: Record<string, number> = {
  'Apparel & Accessories': 0.04,
  Electronics: 0.03,
  'Home & Garden': 0.03,
  Shoes: 0.04,
  Sports: 0.03,
  Beauty: 0.06,
  Books: 0.045,
  General: 0.03,
}

export function getAffiliateRate(category: string): number {
  return RATES[category] ?? 0.03
}
