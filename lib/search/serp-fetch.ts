const SERPAPI_KEY = process.env.SERPAPI_KEY!;
const SERPAPI_BASE = 'https://serpapi.com/search.json';

export interface SerpFetchOptions {
  engine: string;
  query: string;
  extraParams?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Fetch from SerpApi with retry on transient failure.
 * Retries once after a 2-second delay on 429, 5xx, or network timeout.
 * Returns null if all attempts fail. SerpApi refunds credits for failed
 * searches on Best Effort, so failed calls don't cost us money — but
 * the user still gets no result, so we retry once.
 */
export async function serpApiFetch(
  options: SerpFetchOptions
): Promise<Record<string, unknown> | null> {
  const {
    engine,
    query,
    extraParams = {},
    timeoutMs = 8000,
    maxRetries = 1,
  } = options;

  const params = new URLSearchParams({
    engine,
    q: query,
    api_key: SERPAPI_KEY,
    ...extraParams,
  });

  const url = `${SERPAPI_BASE}?${params.toString()}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        return await response.json() as Record<string, unknown>;
      }

      // Retry on 429 or 5xx
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }

      // Non-retryable error (4xx other than 429)
      console.error(`SerpApi error ${response.status} for engine=${engine} query=${query}`);
      return null;

    } catch (err) {
      // Network error or timeout
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      console.error(`SerpApi fetch failed for engine=${engine} query=${query}:`, err);
      return null;
    }
  }

  return null;
}
