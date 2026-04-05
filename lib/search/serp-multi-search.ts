import { serpApiFetch } from './serp-fetch';
import { getCached, setCached } from './search-cache';
import { selectEngines, inferCategory } from './engine-selector';
import type { SearchEngine, ProductCategory } from './engine-selector';

export interface SerpResult {
  engine: SearchEngine;
  title: string;
  price: number | null;
  currency: string;
  url: string;
  thumbnail: string;
  retailerDomain: string;
  confidence?: number;
}

const THUMBNAIL_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='75' y='75' font-family='sans-serif' font-size='11' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
const L1_TTL_SECONDS = 6 * 60 * 60; // 6 hours

/**
 * Parse a price string or number into a float. Returns null if unparseable.
 * Handles: "$19.99", "19.99", "$1,999.99", "£25.50", "Price: $45.00",
 * "From $30", "30.00 USD", and raw numbers.
 */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  if (typeof raw !== 'string') return null;
  const match = raw.replace(/,/g, '').match(/[\d]+(?:\.\d+)?/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  return isNaN(val) ? null : val;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Per-engine result parsers
function parseGoogleShoppingLight(data: Record<string, unknown>): SerpResult[] {
  const items = (data.shopping_results as Record<string, unknown>[]) ?? [];
  return items.map(item => ({
    engine: 'google_shopping_light' as SearchEngine,
    title: String(item.title ?? ''),
    price: typeof item.extracted_price === 'number'
      ? item.extracted_price
      : parsePrice(item.price),
    currency: 'USD',
    url: String(item.link ?? ''),
    thumbnail: String(item.thumbnail ?? item.serpapi_thumbnail ?? THUMBNAIL_PLACEHOLDER),
    retailerDomain: extractDomain(String(item.link ?? '')),
  }));
}

function parseAmazon(data: Record<string, unknown>): SerpResult[] {
  const items = (data.organic_results as Record<string, unknown>[]) ?? [];
  return items.map(item => {
    const priceObj = item.price as Record<string, unknown> | undefined;
    return {
      engine: 'amazon' as SearchEngine,
      title: String(item.title ?? ''),
      price: parsePrice(priceObj?.value ?? priceObj?.raw ?? null),
      currency: String(priceObj?.currency ?? 'USD'),
      url: String(item.link ?? ''),
      thumbnail: String(item.thumbnail ?? THUMBNAIL_PLACEHOLDER),
      retailerDomain: 'amazon.com',
    };
  });
}

function parseWalmart(data: Record<string, unknown>): SerpResult[] {
  const items = (data.organic_results as Record<string, unknown>[]) ?? [];
  return items.map(item => ({
    engine: 'walmart' as SearchEngine,
    title: String(item.title ?? ''),
    price: parsePrice(item.primary_price ?? item.price ?? null),
    currency: 'USD',
    url: String(item.product_page_url ?? item.link ?? ''),
    thumbnail: String(item.thumbnail ?? THUMBNAIL_PLACEHOLDER),
    retailerDomain: 'walmart.com',
  }));
}

function parseBingShopping(data: Record<string, unknown>): SerpResult[] {
  const items = (data.shopping_results as Record<string, unknown>[]) ?? [];
  return items
    .filter(item => item.external_link)
    .map(item => {
      const thumbnails = item.thumbnails as string[] | undefined;
      return {
        engine: 'bing_shopping' as SearchEngine,
        title: String(item.title ?? ''),
        price: typeof item.extracted_price === 'number'
          ? item.extracted_price
          : parsePrice(item.price ?? null),
        currency: 'USD',
        url: String(item.external_link ?? ''),
        thumbnail: thumbnails?.[0] ?? THUMBNAIL_PLACEHOLDER,
        retailerDomain: String(item.seller ?? extractDomain(String(item.external_link ?? ''))),
      };
    });
}

function parseEbay(data: Record<string, unknown>): SerpResult[] {
  const items = (data.organic_results as Record<string, unknown>[]) ?? [];
  return items.map(item => {
    const priceObj = item.price as Record<string, unknown> | undefined;
    return {
      engine: 'ebay' as SearchEngine,
      title: String(item.title ?? ''),
      price: parsePrice(priceObj?.extracted ?? priceObj?.raw ?? null),
      currency: 'USD',
      url: String(item.link ?? ''),
      thumbnail: String(item.thumbnail ?? THUMBNAIL_PLACEHOLDER),
      retailerDomain: 'ebay.com',
    };
  });
}

function parseHomeDepot(data: Record<string, unknown>): SerpResult[] {
  const items = (data.products as Record<string, unknown>[]) ?? [];
  return items.map(item => {
    const priceObj = item.price as Record<string, unknown> | undefined;
    return {
      engine: 'home_depot' as SearchEngine,
      title: String(item.title ?? ''),
      price: parsePrice(priceObj?.current ?? priceObj?.original ?? null),
      currency: 'USD',
      url: String(item.link ?? ''),
      thumbnail: String(item.thumbnail ?? THUMBNAIL_PLACEHOLDER),
      retailerDomain: 'homedepot.com',
    };
  });
}

function parseEngineResults(
  engine: SearchEngine,
  data: Record<string, unknown>
): SerpResult[] {
  switch (engine) {
    case 'google_shopping_light': return parseGoogleShoppingLight(data);
    case 'amazon':                return parseAmazon(data);
    case 'walmart':               return parseWalmart(data);
    case 'bing_shopping':         return parseBingShopping(data);
    case 'ebay':                  return parseEbay(data);
    case 'home_depot':            return parseHomeDepot(data);
    default:                      return [];
  }
}

export interface MultiSearchOptions {
  query: string;
  category?: ProductCategory | string;
  tier: 'unregistered' | 'free' | 'paid';
  timeoutMs?: number;
}

export interface MultiSearchResult {
  results: SerpResult[];
  enginesQueried: SearchEngine[];
  enginesSucceeded: SearchEngine[];
  cacheHit: boolean;
}

/**
 * Run multi-engine parallel search with L1 caching.
 * Uses Promise.allSettled so a failed engine (e.g. Amazon ~30% failure rate)
 * does not block results from other engines.
 */
export async function multiEngineSearch(
  options: MultiSearchOptions
): Promise<MultiSearchResult> {
  const { query, tier, timeoutMs = 8000 } = options;
  const category = options.category ?? inferCategory(query);
  const engines = selectEngines(category, tier);

  if (engines.length === 0) {
    return { results: [], enginesQueried: [], enginesSucceeded: [], cacheHit: false };
  }

  // L1 cache check — keyed on query + engines joined
  const cacheKey = `multi::${engines.join(',')}::${query.toLowerCase().trim()}`;
  const cached = await getCached('multi', cacheKey);
  if (cached) {
    return {
      results: cached as SerpResult[],
      enginesQueried: engines,
      enginesSucceeded: engines,
      cacheHit: true,
    };
  }

  // Parallel fetch across all engines
  const settled = await Promise.allSettled(
    engines.map(async engine => {
      const extraParams: Record<string, string> = {};
      if (engine === 'amazon') extraParams['sort'] = 'price-asc-rank';

      const data = await serpApiFetch({ engine, query, extraParams, timeoutMs });
      if (!data) throw new Error(`${engine} returned null`);
      return { engine, results: parseEngineResults(engine, data) };
    })
  );

  const allResults: SerpResult[] = [];
  const enginesSucceeded: SearchEngine[] = [];

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      allResults.push(...outcome.value.results);
      enginesSucceeded.push(outcome.value.engine);
    }
  }

  // Write to L1 cache
  await setCached('multi', cacheKey, allResults, L1_TTL_SECONDS);

  return {
    results: allResults,
    enginesQueried: engines,
    enginesSucceeded,
    cacheHit: false,
  };
}
