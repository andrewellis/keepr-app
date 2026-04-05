import type { SerpResult } from './serp-multi-search';

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

  // Step 2: Price floor filter — remove items below 15% of median price of name-filtered set
  const prices = nameFiltered
    .map(r => r.price)
    .filter((p): p is number => p !== null && p > 0)
  prices.sort((a, b) => a - b)
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0
  const priceFloor = medianPrice > 0 ? medianPrice * 0.15 : 0

  const valid = priceFloor > 0
    ? nameFiltered.filter(r => r.price === null || r.price >= priceFloor)
    : nameFiltered

  // Existing dedup logic continues unchanged below using valid instead of the old valid
  const kept: SerpResult[] = []

  for (const candidate of valid) {
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
