import { serpApiFetch } from '../search/serp-fetch';
import { parsePrice } from '../search/serp-multi-search';
import { getPriceCheckEngine } from './engine-map';

export interface PriceCheckResult {
  engine: string;
  title: string;
  price: number | null;
  currency: string;
  url: string;
  retailerDomain: string;
  isNewCondition: boolean | null;
}

/**
 * Run a single price check for a tracked item using the best engine
 * for its category. Returns the top result only — we want the current
 * best price, not a full results list.
 * Returns null if the engine returns no usable results.
 */
export async function runPriceCheck(
  searchQuery: string,
  category: string
): Promise<PriceCheckResult | null> {
  const engine = getPriceCheckEngine(category);

  const extraParams: Record<string, string> = {};
  if (engine === 'amazon') extraParams['sort'] = 'price-asc-rank';

  const data = await serpApiFetch({ engine, query: searchQuery, extraParams });
  if (!data) return null;

  // Extract first result based on engine schema
  let item: Record<string, unknown> | null = null;

  if (engine === 'google_shopping_light' || engine === 'bing_shopping') {
    const results = data.shopping_results as Record<string, unknown>[] | undefined;
    item = results?.[0] ?? null;
  } else if (engine === 'amazon') {
    const results = data.organic_results as Record<string, unknown>[] | undefined;
    item = results?.[0] ?? null;
  } else if (engine === 'walmart') {
    const results = data.organic_results as Record<string, unknown>[] | undefined;
    item = results?.[0] ?? null;
  } else if (engine === 'home_depot') {
    const results = data.products as Record<string, unknown>[] | undefined;
    item = results?.[0] ?? null;
  } else if (engine === 'ebay') {
    const results = data.organic_results as Record<string, unknown>[] | undefined;
    item = results?.[0] ?? null;
  }

  if (!item) return null;

  const url = String(
    item.link ?? item.product_page_url ?? ''
  );

  let price: number | null = null;
  if (engine === 'google_shopping_light') {
    price = typeof item.extracted_price === 'number'
      ? item.extracted_price
      : parsePrice(item.price);
  } else if (engine === 'amazon') {
    const priceObj = item.price as Record<string, unknown> | undefined;
    price = parsePrice(priceObj?.value ?? priceObj?.raw ?? null);
  } else {
    price = parsePrice(item.price ?? item.primary_price ?? null);
  }

  let retailerDomain = '';
  try {
    retailerDomain = new URL(url).hostname.replace('www.', '');
  } catch {
    retailerDomain = engine.replace('_', '.');
  }

  return {
    engine,
    title: String(item.title ?? ''),
    price,
    currency: 'USD',
    url,
    retailerDomain,
    isNewCondition: null,
  };
}
