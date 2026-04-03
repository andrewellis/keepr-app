import type { ShoppingResult } from './types'

const SERPAPI_TIMEOUT_MS = 3_000

export async function getShoppingResults(query: string): Promise<ShoppingResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    return []
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS)

  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: apiKey,
      num: '5',
      gl: 'us',
      hl: 'en',
    })

    const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
      signal: controller.signal,
    })

    if (!res.ok) {
      console.error(`[shopping] SerpApi returned ${res.status}`)
      return []
    }

    const data = await res.json()
    const raw: unknown[] = Array.isArray(data?.shopping_results) ? data.shopping_results : []

    const filtered = raw.filter((item): item is Record<string, unknown> => {
      if (typeof item !== 'object' || item === null) return false
      const r = item as Record<string, unknown>
      return typeof r.extracted_price === 'number' && r.extracted_price > 0 && typeof r.thumbnail === 'string' && r.thumbnail.length > 0
    })

    return filtered.slice(0, 2).map((r) => ({
      title: typeof r.title === 'string' ? r.title : '',
      price: typeof r.price === 'string' ? r.price : '',
      priceValue: typeof r.extracted_price === 'number' ? r.extracted_price : 0,
      merchant: typeof r.source === 'string' ? r.source : '',
      imageUrl: typeof r.thumbnail === 'string' ? r.thumbnail : '',
      productUrl: typeof r.link === 'string' && r.link ? r.link : (typeof r.product_link === 'string' ? r.product_link : ''),
      rating: typeof r.rating === 'number' ? r.rating : null,
      reviews: typeof r.reviews === 'number' ? r.reviews : null,
    }))
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[shopping] SerpApi request timed out')
    } else {
      console.error('[shopping] SerpApi error:', err)
    }
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
