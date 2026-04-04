import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CachedResult {
  results_json: unknown;
  hit_count: number;
}

/**
 * Generate a deterministic cache key for an engine+query combination.
 * Normalized to lowercase and trimmed to maximize hit rate.
 */
export function buildCacheKey(engine: string, query: string): string {
  return `${engine}::${query.toLowerCase().trim()}`;
}

/**
 * Retrieve a cached result if it exists and has not expired.
 * Increments hit_count on cache hit.
 */
export async function getCached(
  engine: string,
  query: string
): Promise<unknown | null> {
  const key = buildCacheKey(engine, query);

  const { data, error } = await supabase
    .from('search_cache')
    .select('id, results_json, hit_count, expires_at')
    .eq('cache_key', key)
    .single();

  if (error || !data) return null;

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    // Expired — delete and return null
    await supabase.from('search_cache').delete().eq('cache_key', key);
    return null;
  }

  // Increment hit count (fire and forget)
  supabase
    .from('search_cache')
    .update({ hit_count: data.hit_count + 1 })
    .eq('cache_key', key)
    .then(() => {});

  return data.results_json;
}

/**
 * Write results to cache with a TTL in seconds.
 * Uses upsert to handle race conditions gracefully.
 */
export async function setCached(
  engine: string,
  query: string,
  results: unknown,
  ttlSeconds: number
): Promise<void> {
  const key = buildCacheKey(engine, query);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const resultCount = Array.isArray(results) ? results.length : 0;

  const { error } = await supabase.from('search_cache').upsert(
    {
      cache_key: key,
      engine,
      query: query.toLowerCase().trim(),
      results_json: results,
      result_count: resultCount,
      expires_at: expiresAt,
      hit_count: 0,
    },
    { onConflict: 'cache_key' }
  );

  if (error) {
    console.error('search_cache write error:', error.message);
  }
}
