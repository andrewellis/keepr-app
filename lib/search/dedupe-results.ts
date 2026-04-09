import type { SerpResult } from './serp-multi-search';

function extractSize(text: string): { value: number; unit: string } | null {
  const match = text.toLowerCase().match(
    /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|ounces?|oz|milliliters?|ml|liters?|l|pounds?|lb|grams?|g|kg|kilograms?|counts?|ct|packs?|pk)/
  );
  if (!match) return null;
  const unitRaw = match[2].replace(/\s+/g, '');
  const unitMap: Record<string, string> = {
    'floz': 'oz', 'fl.oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
    'milliliter': 'ml', 'milliliters': 'ml',
    'liter': 'l', 'liters': 'l',
    'pound': 'lb', 'pounds': 'lb',
    'gram': 'g', 'grams': 'g',
    'kilogram': 'kg', 'kilograms': 'kg',
    'count': 'ct', 'counts': 'ct',
    'pack': 'pk', 'packs': 'pk',
  };
  const unit = unitMap[unitRaw] ?? unitRaw;
  return { value: parseFloat(match[1]), unit };
}

/**
 * Deduplicate SerpResults across engines.
 * Two results are considered duplicates if their normalized titles share
 * >= 80% word overlap AND their prices are within 5% of each other (or both null).
 * When duplicates are found, keep the result with the lower price.
 * Results with no URL are dropped.
 *
 * If productName is provided, results with < 25% title word overlap are filtered out.
 * A price floor filter removes items below 15% of the median price of name-filtered results.
 */
export function dedupeResults(results: SerpResult[], productName?: string): SerpResult[] {
  const targetWords = productName ? normalizeTitle(productName) : null

  // Step 1: Filter by URL presence and name relevance
  const nameFiltered = results.filter(r => {
    if (!r.url || r.url.length === 0) return false
    if (targetWords && targetWords.size > 0) {
      const resultWords = normalizeTitle(r.title)
      const overlap = wordOverlap(targetWords, resultWords)
      if (overlap < 0.25) return false
    }
    return true
  })

  // Stage: strict size filter
  // If the product name contains a size, drop results with a different size of the same unit type
  const productSize = productName ? extractSize(productName) : null;
  let sizeFiltered = nameFiltered;
  if (productSize) {
    sizeFiltered = nameFiltered.filter(result => {
      const resultSize = extractSize(result.title ?? '');
      if (!resultSize) return false; // no size in result title — drop it in strict mode
      if (resultSize.unit !== productSize.unit) return true; // different unit type — keep it
      return resultSize.value === productSize.value; // same unit — only keep if size matches
    });
  }

  // Step 2: Price floor filter — remove items below 15% of median price of name-filtered set
  const prices = sizeFiltered
    .map(r => r.price)
    .filter((p): p is number => p !== null && p > 0)
  prices.sort((a, b) => a - b)
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0
  const priceFloor = medianPrice > 0 ? medianPrice * 0.25 : 0

  const valid = priceFloor > 0
    ? sizeFiltered.filter(r => r.price === null || r.price >= priceFloor)
    : sizeFiltered

  const conditionFiltered = valid.filter(r => {
    if (!r.condition) return true
    const c = r.condition.toLowerCase()
    return !['refurbished', 'renewed', 'pre-owned', 'used', 'for parts'].some(term => c.includes(term))
  })

  const outlierFiltered = conditionFiltered.filter(r => {
    if (r.price === null || medianPrice <= 0) return true
    if (r.price >= medianPrice * 0.5) return true
    const reviewCount = typeof r.reviews === 'number' ? r.reviews : 0
    return reviewCount >= 10
  })

  // Existing dedup logic continues unchanged below using valid instead of the old valid
  const kept: SerpResult[] = []

  for (const candidate of outlierFiltered) {
    const candidateWords = normalizeTitle(candidate.title)
    let isDuplicate = false

    for (let i = 0; i < kept.length; i++) {
      const keptWords = normalizeTitle(kept[i].title)
      if (
        wordOverlap(candidateWords, keptWords) >= 0.8 &&
        pricesClose(candidate.price, kept[i].price)
      ) {
        if (
          candidate.price !== null &&
          (kept[i].price === null || candidate.price < kept[i].price!)
        ) {
          kept[i] = candidate
        }
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      kept.push(candidate)
    }
  }

  return kept
}

function normalizeTitle(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

function wordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach(word => {
    if (b.has(word)) shared++;
  });
  return shared / Math.max(a.size, b.size);
}

function pricesClose(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  const diff = Math.abs(a - b) / Math.max(a, b);
  return diff <= 0.05;
}
