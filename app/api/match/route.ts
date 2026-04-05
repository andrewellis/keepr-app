import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveNetworks } from '@/lib/affiliates/registry'
import { rankResults } from '@/lib/affiliates/ranker'
import type { AffiliateResult } from '@/lib/affiliates/types'
import { attachClickIds } from '@/lib/clicks/generate'
import { getShoppingResults } from '@/lib/shopping/serpapi'
import { multiEngineSearch } from '@/lib/search/serp-multi-search'
import { dedupeResults } from '@/lib/search/dedupe-results'
import { crossPollinate } from '@/lib/price-tracker/cross-pollinate'
import type { MultiSearchOptions } from '@/lib/search/serp-multi-search'

const NETWORK_TIMEOUT_MS = 5_000

// ─── Retailer detection ───────────────────────────────────────────────────────

type MessageVariant = 'amazon_screenshot' | 'competitor_screenshot' | 'generic'

interface RetailerContext {
  detectedRetailer: string
  messageVariant: MessageVariant
}

interface EngagementMessage {
  headline: string
  subtext: string
  priceComparisonIntro: string
}

interface SearchMetadata {
  detectedRetailer: string
  enginesUsed: number
  resultsFound: number
}

/**
 * Detect a known retailer from Vision API labels.
 * Returns the retailer name (lowercase) or empty string if none detected.
 */
function detectRetailerFromLabels(labels: string[]): string {
  const joined = labels.join(' ').toLowerCase()
  if (joined.includes('amazon')) return 'amazon'
  if (joined.includes('walmart')) return 'walmart'
  if (joined.includes('target')) return 'target'
  if (joined.includes('best buy') || joined.includes('bestbuy')) return 'bestbuy'
  if (joined.includes('home depot') || joined.includes('homedepot')) return 'homedepot'
  return ''
}

function buildRetailerContext(detectedRetailer: string): RetailerContext {
  if (detectedRetailer === 'amazon') {
    return { detectedRetailer: 'amazon', messageVariant: 'amazon_screenshot' }
  }
  if (['walmart', 'target', 'bestbuy', 'homedepot'].includes(detectedRetailer)) {
    return { detectedRetailer, messageVariant: 'competitor_screenshot' }
  }
  return { detectedRetailer: '', messageVariant: 'generic' }
}

function buildEngagementMessage(
  retailerContext: RetailerContext,
  serpResults: ReturnType<typeof dedupeResults>,
  affiliateResults: AffiliateResult[]
): EngagementMessage {
  const subtext = "K33pr checks prices so you don't have to."
  const priceComparisonIntro = "Here's what we found:"

  let headline = ''

  if (retailerContext.messageVariant === 'amazon_screenshot') {
    // Find cheapest non-Amazon result with a price
    const nonAmazon = serpResults.filter(
      (r) => !r.retailerDomain.includes('amazon') && r.price !== null && r.price > 0
    )
    nonAmazon.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    const cheapest = nonAmazon[0]

    if (cheapest && cheapest.price !== null) {
      const savings = cheapest.price.toFixed(2)
      const retailerName = cheapest.retailerDomain.replace('www.', '').split('.')[0]
      headline = `Found this Amazon product! We found it $${savings} cheaper at ${retailerName} 💰`
    } else {
      headline = 'Found this Amazon product! Comparing prices across multiple retailers 💰'
    }
  } else if (retailerContext.messageVariant === 'competitor_screenshot') {
    const retailerDisplay =
      retailerContext.detectedRetailer.charAt(0).toUpperCase() +
      retailerContext.detectedRetailer.slice(1)
    headline = `Found this ${retailerDisplay} product! Comparing prices across retailers...`
  } else {
    const count = serpResults.length + affiliateResults.length
    if (count > 0) {
      headline = `We found ${count} price results across retailers`
    } else {
      headline = 'Comparing prices across retailers...'
    }
  }

  return { headline, subtext, priceComparisonIntro }
}

/**
 * Strips the `tag` query parameter from Amazon URLs when AMAZON_ASSOCIATE_TAG
 * is empty. This handles the case where the frozen amazon.ts file always appends
 * a tag — we clean it up downstream before returning to the frontend.
 */
function stripEmptyAmazonTag(url: string): string {
  if (process.env.AMAZON_ASSOCIATE_TAG) return url
  try {
    const u = new URL(url)
    if (!u.hostname.includes('amazon.com')) return url
    u.searchParams.delete('tag')
    return u.toString()
  } catch {
    return url.replace(/[?&]tag=[^&]*/g, '')
  }
}

export async function POST(req: NextRequest) {
  let body: {
    productName?: string
    category?: string
    searchTerms?: string[]
    visionLabels?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const productName = body.productName?.trim()
  if (!productName) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const category = body.category?.trim() ?? 'General'
  const searchTerms = body.searchTerms?.length ? body.searchTerms : [productName]
  // Vision labels may be passed from the scan pipeline for retailer detection
  const visionLabels: string[] = Array.isArray(body.visionLabels) ? body.visionLabels : []

  // Extract request metadata for click tracking
  const forwardedFor = req.headers.get('x-forwarded-for')
  const requestIp = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (req.headers.get('x-real-ip') ?? 'unknown')
  const requestUserAgent = req.headers.get('user-agent') ?? 'unknown'

  // Read cashback_rate from user profile if authenticated; capture userId for click tracking
  // Also determine user tier for multiEngineSearch
  let cashbackRate = 0.05
  let userId: string | null = null
  let userTier: MultiSearchOptions['tier'] = 'unregistered'

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      userTier = 'free' // authenticated but not paid by default
      console.log('[match] userTier resolved:', userTier, 'userId:', userId)

      const { data: profile } = await supabase
        .from('profiles')
        .select('cashback_rate')
        .eq('id', user.id)
        .single()
      if (profile?.cashback_rate) {
        cashbackRate = Number(profile.cashback_rate)
      }
    }
  } catch {
    // Fall through with default cashback rate and unregistered tier
  }

  try {
    const networks = getActiveNetworks()

    // Call all networks in parallel with per-network timeout
    const settled = await Promise.all(
      networks.map(async (searchFn) => {
        const networkName = searchFn.name || 'unknown'
        const start = Date.now()

        console.log(`[match] Calling ${networkName}...`)

        try {
          const result = await Promise.race<AffiliateResult[]>([
            searchFn(searchTerms, category, cashbackRate),
            new Promise<AffiliateResult[]>((resolve) =>
              setTimeout(() => {
                console.log(`[match] ${networkName} timed out after ${NETWORK_TIMEOUT_MS}ms`)
                resolve([])
              }, NETWORK_TIMEOUT_MS)
            ),
          ])

          const elapsed = Date.now() - start
          console.log(`[match] ${networkName} returned ${result.length} results in ${elapsed}ms`)
          return result
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.log(`[match] ${networkName} error: ${message}`)
          return [] as AffiliateResult[]
        }
      })
    )

    // Flatten all results and run through ranker
    const allResults = settled.flat()
    const ranked = rankResults(allResults)

    // Strip empty Amazon tags before click ID attachment (which stores URLs in DB)
    const cleanedResults = ranked.map((r) => ({
      ...r,
      affiliateUrl: stripEmptyAmazonTag(r.affiliateUrl),
      productUrl: r.productUrl ? stripEmptyAmazonTag(r.productUrl) : r.productUrl,
    }))

    // Run affiliate click-ID attachment, Google Shopping lookup, AND multiEngineSearch in parallel
    // Promise.allSettled ensures neither blocks the other
    const [affiliateOutcome, shoppingOutcome, serpOutcome] = await Promise.allSettled([
      // Attach Click IDs: appends tracking params to URLs and writes DB records
      // CRITICAL: Only results with successful DB inserts are returned
      attachClickIds(cleanedResults, userId, requestIp, requestUserAgent),
      // Price check — informational only, no tracking
      getShoppingResults(productName),
      // Multi-engine SERP search — runs in parallel with affiliate logic
      (console.log('[match] calling multiEngineSearch with tier:', userTier, 'query:', productName),
      multiEngineSearch({
        query: productName,
        category,
        tier: userTier,
      })),
    ])

    const trackedResults =
      affiliateOutcome.status === 'fulfilled' ? affiliateOutcome.value : []
    const shoppingResults =
      shoppingOutcome.status === 'fulfilled' ? shoppingOutcome.value : []
    const serpSearchResult =
      serpOutcome.status === 'fulfilled' ? serpOutcome.value : null

    // ── Post-search processing (wrapped in try/catch so errors never break the response) ──
    let dedupedSerpResults: ReturnType<typeof dedupeResults> = []
    let retailerContext: RetailerContext = { detectedRetailer: '', messageVariant: 'generic' }
    let engagementMessage: EngagementMessage = {
      headline: '',
      subtext: "K33pr checks prices so you don't have to.",
      priceComparisonIntro: "Here's what we found:",
    }
    let searchMetadata: SearchMetadata = {
      detectedRetailer: '',
      enginesUsed: 0,
      resultsFound: 0,
    }

    try {
      // Deduplicate SERP results
      if (serpSearchResult) {
        dedupedSerpResults = dedupeResults(serpSearchResult.results)

        // Fire-and-forget cross-pollination — must never block the response
        crossPollinate(dedupedSerpResults, userId).catch(() => {})

        searchMetadata = {
          detectedRetailer: '',
          enginesUsed: serpSearchResult.enginesQueried.length,
          resultsFound: dedupedSerpResults.length,
        }
      }

      // Retailer detection from Vision labels
      const detectedRetailer = detectRetailerFromLabels(visionLabels)
      retailerContext = buildRetailerContext(detectedRetailer)
      searchMetadata.detectedRetailer = retailerContext.detectedRetailer

      // Build engagement message
      engagementMessage = buildEngagementMessage(
        retailerContext,
        dedupedSerpResults,
        trackedResults
      )
    } catch (enrichErr) {
      // Non-fatal: log and continue with defaults
      console.error('[match] enrichment error (non-fatal):', enrichErr)
    }

    return NextResponse.json({
      results: trackedResults,
      shoppingResults,
      serpResults: dedupedSerpResults,
      retailerContext,
      engagementMessage,
      searchMetadata,
    })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
