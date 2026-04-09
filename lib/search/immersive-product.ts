import type { SerpResult } from './serp-multi-search';
import { serpApiFetch } from './serp-fetch';
import type { SearchEngine } from './engine-selector';

export interface ImmersiveProductMeta {
  brand?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  priceRange?: string;
}

export interface ImmersiveProductResult {
  stores: SerpResult[];
  meta: ImmersiveProductMeta;
}

export async function fetchImmersiveProduct(
  pageToken: string,
  timeoutMs: number = 6000
): Promise<ImmersiveProductResult | null> {
  const response = await serpApiFetch({
    engine: 'google_immersive_product',
    query: '',
    extraParams: { page_token: pageToken, more_stores: 'true' },
    timeoutMs,
  });

  if (response === null) return null;

  const productResults = (response.product_results ?? {}) as Record<string, unknown>;

  const rawStores = Array.isArray(productResults.stores)
    ? (productResults.stores as Record<string, unknown>[])
    : [];

  const stores: SerpResult[] = rawStores
    .filter(store => {
      if (!store.link) return false;
      if (typeof store.extracted_price !== 'number') return false;
      const details = Array.isArray(store.details_and_offers)
        ? (store.details_and_offers as string[])
        : [];
      if (details.some(d => d.toLowerCase().includes('out of stock'))) return false;
      if (details.some(d => d.toLowerCase().includes('pre-owned') || d.toLowerCase().includes('refurbished'))) return false;
      return true;
    })
    .map(store => {
      const details = Array.isArray(store.details_and_offers)
        ? (store.details_and_offers as string[])
        : undefined;

      let retailerDomain = '';
      try {
        retailerDomain = new URL(store.link as string).hostname.replace('www.', '');
      } catch {
        retailerDomain = '';
      }

      let delivery: string[] | undefined;
      if (details) {
        const deliveryEntries = details.filter(d =>
          /delivery|shipping/i.test(d)
        );
        if (deliveryEntries.length > 0) {
          delivery = deliveryEntries;
        } else {
          const freeDelivery = details.filter(d =>
            /free/i.test(d) && /deliver|ship/i.test(d)
          );
          if (freeDelivery.length > 0) {
            delivery = freeDelivery;
          }
        }
      }

      const inStock: boolean | undefined = details
        ? details.some(d => d.toLowerCase().includes('in stock'))
          ? true
          : undefined
        : undefined;

      return {
        engine: 'google_immersive_product' as SearchEngine,
        title: typeof store.title === 'string' ? store.title : '',
        price: typeof store.extracted_price === 'number' ? store.extracted_price : null,
        oldPrice: typeof store.extracted_original_price === 'number' ? store.extracted_original_price : undefined,
        currency: 'USD',
        url: typeof store.link === 'string' ? store.link : '',
        thumbnail: '',
        retailerDomain,
        rating: typeof store.rating === 'number' ? store.rating : undefined,
        reviews: typeof store.reviews === 'number' ? store.reviews : undefined,
        seller: typeof store.name === 'string' ? store.name : undefined,
        delivery,
        in_stock: inStock,
        extensions: details,
      } satisfies SerpResult;
    });

  const meta: ImmersiveProductMeta = {
    brand: typeof productResults.brand === 'string' ? productResults.brand : undefined,
    title: typeof productResults.title === 'string' ? productResults.title : undefined,
    rating: typeof productResults.rating === 'number' ? productResults.rating : undefined,
    reviews: typeof productResults.reviews === 'number' ? productResults.reviews : undefined,
    priceRange: typeof productResults.price_range === 'string' ? productResults.price_range : undefined,
  };

  return { stores, meta };
}
