/**
 * SerpApi engines available for product search.
 * google_shopping (full) provides richer data than google_shopping_light: ratings, reviews,
 * seller names, delivery info, and product extensions. Slower but worth the data quality.
 * amazon engine fails ~30% of the time on Best Effort — always use with Promise.allSettled.
 * bing_shopping is a dedicated shopping engine, different schema from bing web search.
 */
export type SearchEngine =
  | 'google_shopping'
  | 'google_immersive_product'
  | 'amazon'
  | 'walmart'
  | 'bing_shopping'
  | 'ebay'
  | 'home_depot'
  | 'bestbuy';

export type ProductCategory =
  | 'electronics'
  | 'home_improvement'
  | 'general'
  | 'furniture'
  | 'appliances';

/**
 * Engine sets per tier:
 * - free: 3 engines (cost-controlled)
 * - paid: 4 engines (broader coverage)
 *
 * Engine ordering within each array reflects priority — first engine
 * is most likely to return results for that category.
 */
const ENGINE_MAP: Record<ProductCategory, Record<'free' | 'paid', SearchEngine[]>> = {
  electronics: {
    free: ['google_shopping', 'amazon', 'ebay'],
    paid: ['google_shopping', 'amazon', 'ebay', 'bing_shopping', 'bestbuy'],
  },
  home_improvement: {
    free: ['google_shopping', 'home_depot', 'amazon'],
    paid: ['google_shopping', 'home_depot', 'amazon'],
  },
  furniture: {
    free: ['google_shopping', 'amazon'],
    paid: ['google_shopping', 'amazon', 'bing_shopping'],
  },
  appliances: {
    free: ['google_shopping', 'amazon'],
    paid: ['google_shopping', 'amazon', 'home_depot'],
  },
  general: {
    free: ['google_shopping', 'amazon'],
    paid: ['google_shopping', 'amazon', 'bing_shopping'],
  },
};

/**
 * Returns the list of engines to query for a given category and user tier.
 * Unregistered users get no SerpApi engines (Vision + Claude only).
 */
export function selectEngines(
  category: ProductCategory | string,
  tier: 'unregistered' | 'free' | 'paid'
): SearchEngine[] {
  if (tier === 'unregistered') return [];

  const normalizedCategory = (
    Object.keys(ENGINE_MAP).includes(category) ? category : 'general'
  ) as ProductCategory;

  return ENGINE_MAP[normalizedCategory][tier];
}

/**
 * Infer a broad product category from a product title string.
 * Used when no category is explicitly provided.
 * Defaults to 'general' if no keywords match.
 */
export function inferCategory(title: string): ProductCategory {
  const lower = title.toLowerCase();

  if (/\b(tv|television|laptop|phone|tablet|camera|headphone|speaker|monitor|keyboard|mouse|gaming|console|router|printer)\b/.test(lower)) {
    return 'electronics';
  }
  if (/\b(drill|saw|lumber|pipe|faucet|toilet|tile|paint|tool|ladder|outlet|wire|plumbing|roofing)\b/.test(lower)) {
    return 'home_improvement';
  }
  if (/\b(sofa|couch|chair|desk|table|bed|dresser|bookshelf|cabinet|mattress|rug|curtain)\b/.test(lower)) {
    return 'furniture';
  }
  if (/\b(refrigerator|washer|dryer|dishwasher|microwave|oven|stove|freezer|air conditioner|vacuum)\b/.test(lower)) {
    return 'appliances';
  }

  return 'general';
}
