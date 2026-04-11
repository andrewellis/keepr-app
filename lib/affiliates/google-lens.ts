const SERPAPI_KEY = process.env.SERPAPI_KEY!;
const SERPAPI_BASE = 'https://serpapi.com/search.json';

export interface LensResult {
  title: string;
  url: string;
  thumbnail: string;
  confidence?: number;
  source?: string;
  price?: number;
  inStock?: boolean;
  rating?: number;
  reviews?: number;
}

/**
 * Search Google Lens via SerpApi using an image URL.
 * Google Lens takes a URL parameter, not a text query, so it cannot
 * use serpApiFetch (which always sets q=). Inline retry is implemented here.
 * Returns an empty array on failure — never throws.
 */
export async function googleLensSearch(imageUrl: string): Promise<LensResult[]> {
  const params = new URLSearchParams({
    engine: 'google_lens',
    url: imageUrl,
    api_key: SERPAPI_KEY,
  });

  const fetchUrl = `${SERPAPI_BASE}?${params.toString()}`;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return [];
      }

      const data = await response.json() as Record<string, unknown>;
      const visual = (data.visual_matches as Record<string, unknown>[]) ?? [];

      return visual.slice(0, 10).map(item => ({
        title: String(item.title ?? ''),
        url: String(item.link ?? ''),
        thumbnail: String(item.thumbnail ?? ''),
        confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
        source: typeof item.source === 'string' ? item.source : undefined,
        price: (() => {
          const p = item.price as Record<string, unknown> | undefined;
          return p && typeof p.extracted_value === 'number' ? p.extracted_value : undefined;
        })(),
        inStock: typeof item.in_stock === 'boolean' ? item.in_stock : undefined,
        rating: typeof item.rating === 'number' ? item.rating : undefined,
        reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
      }));

    } catch {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return [];
    }
  }

  return [];
}
