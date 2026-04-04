import type { SearchEngine } from '../search/engine-selector';

/**
 * Maps product categories to the single best engine for price checks.
 * Price checks run weekly via cron — we use one engine per item to
 * minimize SerpApi credit consumption. google_shopping_light is the
 * default: fastest, highest uptime, broadest coverage.
 */
const PRICE_CHECK_ENGINE_MAP: Record<string, SearchEngine> = {
  electronics:      'google_shopping_light',
  home_improvement: 'home_depot',
  furniture:        'walmart',
  appliances:       'google_shopping_light',
  general:          'google_shopping_light',
};

export function getPriceCheckEngine(category: string): SearchEngine {
  return PRICE_CHECK_ENGINE_MAP[category] ?? 'google_shopping_light';
}
