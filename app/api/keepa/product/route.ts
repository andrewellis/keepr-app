import { NextResponse } from 'next/server';
import { keepaFetchProduct } from '@/lib/keepa/keepa-fetch';
import { getCached, setCached } from '@/lib/search/search-cache';

const CACHE_ENGINE = 'keepa_product';
const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asin = searchParams.get('asin')?.trim().toUpperCase();

  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.json({ error: 'Invalid or missing ASIN' }, { status: 400 });
  }

  // Check cache first
  const cached = await getCached(CACHE_ENGINE, asin);
  if (cached) {
    const cachedData = Array.isArray(cached) ? cached[0] : cached;
    return NextResponse.json({ data: cachedData, cached: true });
  }

  // Fetch from Keepa
  const data = await keepaFetchProduct(asin);
  console.log('[KEEPA DEBUG] asin:', asin, 'data:', JSON.stringify(data));

  if (!data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Cache the result (30 min TTL), fire and forget
  setCached(CACHE_ENGINE, asin, [data], CACHE_TTL_SECONDS).catch(err =>
    console.error('[KEEPA CACHE WRITE]', err)
  );

  return NextResponse.json({ data, cached: false });
}
