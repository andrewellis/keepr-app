import type { SerpResult } from './serp-multi-search';

/**
 * Deduplicate SerpResults across engines.
 * Two results are considered duplicates if their normalized titles share
 * >= 80% word overlap AND their prices are within 5% of each other (or both null).
 * When duplicates are found, keep the result with the lower price.
 * Results with no URL are dropped.
 */
export function dedupeResults(results: SerpResult[]): SerpResult[] {
  const valid = results.filter(r => r.url && r.url.length > 0);

  const kept: SerpResult[] = [];

  for (const candidate of valid) {
    const candidateWords = normalizeTitle(candidate.title);
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const keptWords = normalizeTitle(kept[i].title);
      if (
        wordOverlap(candidateWords, keptWords) >= 0.8 &&
        pricesClose(candidate.price, kept[i].price)
      ) {
        // Keep the lower price
        if (
          candidate.price !== null &&
          (kept[i].price === null || candidate.price < kept[i].price!)
        ) {
          kept[i] = candidate;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
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
