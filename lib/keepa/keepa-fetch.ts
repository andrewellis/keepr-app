const KEEPA_API_KEY = process.env.KEEPA_API_KEY!;
const KEEPA_BASE = 'https://api.keepa.com';
const DOMAIN_US = 1;

export interface KeepaPrice {
  timestamp: number; // Unix milliseconds
  price: number;     // USD dollars (already divided by 100)
}

export interface KeepaProductData {
  asin: string;
  title: string;
  currentPrice: number | null;       // Current Amazon price in USD
  currentBuyBox: number | null;      // Current Buy Box price in USD
  avg30: number | null;              // 30-day average in USD
  avg90: number | null;              // 90-day average in USD
  allTimeLow: number | null;         // All-time low in USD
  allTimeHigh: number | null;        // All-time high in USD
  priceHistory90Days: KeepaPrice[];  // Array of {timestamp, price} for last 90 days
  isAboveAverage: boolean | null;    // true if current > avg90
  percentVsAvg90: number | null;     // e.g. -12.5 means 12.5% below 90-day avg
  rating: number | null;             // e.g. 4.5
  reviewCount: number | null;
}

/**
 * Convert Keepa time minutes to Unix milliseconds.
 * Keepa time: minutes since Jan 1, 2011.
 * Formula: (keepaTime + 21564000) * 60 * 1000
 */
function keepaTimeToMs(keepaTime: number): number {
  return (keepaTime + 21564000) * 60 * 1000;
}

/**
 * Convert Keepa price integer to USD dollars.
 * Keepa stores prices as integer cents * 100. -1 means unavailable.
 * Divide by 100 to get dollars. Return null for -1.
 */
function keepaPrice(raw: number | undefined): number | null {
  if (raw === undefined || raw === -1 || raw < 0) return null;
  return raw / 100;
}

/**
 * Extract price history from a Keepa csv array.
 * Keepa csv arrays are flat [time, value, time, value, ...] pairs.
 * Returns all data points regardless of age. Skip entries where value === -1.
 */
function extractPriceHistory(csv: number[] | undefined): KeepaPrice[] {
  if (!csv || csv.length < 2) return [];
  const result: KeepaPrice[] = [];
  for (let i = 0; i + 1 < csv.length; i += 2) {
    const ts = keepaTimeToMs(csv[i]);
    const price = csv[i + 1];
    if (price === -1 || price < 0) continue;
    result.push({ timestamp: ts, price: price / 100 });
  }
  return result;
}

/**
 * Fetch price history data for a single ASIN from Keepa.
 * Uses stats=180 for pre-computed statistics.
 * Uses history=1 with days=90 to get 90-day price history array.
 * Returns null if the request fails or the ASIN is not found.
 */
export async function keepaFetchProduct(asin: string): Promise<KeepaProductData | null> {
  const params = new URLSearchParams({
    key: KEEPA_API_KEY,
    domain: String(DOMAIN_US),
    asin,
    stats: '180',
    history: '1',
    days: '90',
  });

  try {
    const res = await fetch(`${KEEPA_BASE}/product?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[KEEPA] Request failed: ${res.status} for ASIN ${asin}`);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;

    const products = data.products as Record<string, unknown>[] | undefined;
    if (!products || products.length === 0) return null;

    const product = products[0];
    const stats = product.stats as Record<string, unknown> | undefined;
    const csv = product.csv as (number[] | null)[] | undefined;

    // csv[0] = AMAZON price history
    // csv[1] = NEW (marketplace) price history
    // csv[3] = MARKETPLACE NEW price history (updates more frequently)
    // csv[17] = BUY BOX price history
    const amazonCsv = csv?.[0] ?? undefined;
    const marketplaceNewCsv = csv?.[3] ?? undefined;

    // stats.current is an array indexed by price type
    // Index 0 = AMAZON, Index 1 = NEW, Index 17 = BUY BOX
    const current = stats?.current as number[] | undefined;
    const avg30Arr = stats?.avg30 as number[] | undefined;
    const avg90Arr = stats?.avg90 as number[] | undefined;
    const minArr = stats?.min as [number, number][] | undefined;
    const maxArr = stats?.max as [number, number][] | undefined;

    const currentPrice = keepaPrice(current?.[0]);
    const currentBuyBox = keepaPrice(current?.[17]);
    const avg30 = keepaPrice(avg30Arr?.[0]);
    const avg90 = keepaPrice(avg90Arr?.[0]);
    const allTimeLow = keepaPrice(minArr?.[0]?.[1]);
    const allTimeHigh = keepaPrice(maxArr?.[0]?.[1]);

    const priceToUse = currentBuyBox ?? currentPrice;
    const isAboveAverage = priceToUse !== null && avg90 !== null
      ? priceToUse > avg90
      : null;
    const percentVsAvg90 = priceToUse !== null && avg90 !== null && avg90 > 0
      ? Math.round(((priceToUse - avg90) / avg90) * 100 * 10) / 10
      : null;

    // Rating: stored as integer, divide by 10 (e.g. 45 = 4.5)
    const ratingRaw = current?.[33];
    const rating = ratingRaw !== undefined && ratingRaw !== -1
      ? ratingRaw / 10
      : null;

    const reviewCountRaw = current?.[16];
    const reviewCount = reviewCountRaw !== undefined && reviewCountRaw !== -1
      ? reviewCountRaw
      : null;

    const amazonHistory = extractPriceHistory(amazonCsv as number[] | undefined);
    const marketplaceHistory = extractPriceHistory(marketplaceNewCsv as number[] | undefined);
    const priceHistory90Days = amazonHistory.length >= 3 ? amazonHistory : marketplaceHistory;

    return {
      asin,
      title: (product.title as string) ?? '',
      currentPrice,
      currentBuyBox,
      avg30,
      avg90,
      allTimeLow,
      allTimeHigh,
      priceHistory90Days,
      isAboveAverage,
      percentVsAvg90,
      rating,
      reviewCount,
    };
  } catch (err) {
    console.error(`[KEEPA] Fetch error for ASIN ${asin}:`, err instanceof Error ? err.message : err);
    return null;
  }
}
