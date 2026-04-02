import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveNetworks } from '@/lib/affiliates/registry'
import { rankResults } from '@/lib/affiliates/ranker'
import type { AffiliateResult } from '@/lib/affiliates/types'
import { attachClickIds } from '@/lib/clicks/generate'

const NETWORK_TIMEOUT_MS = 5_000

export async function POST(req: NextRequest) {
  let body: { productName?: string; category?: string; searchTerms?: string[] }
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

  // Extract request metadata for click tracking
  const forwardedFor = req.headers.get('x-forwarded-for')
  const requestIp = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (req.headers.get('x-real-ip') ?? 'unknown')
  const requestUserAgent = req.headers.get('user-agent') ?? 'unknown'

  // Read cashback_rate from user profile if authenticated; capture userId for click tracking
  let cashbackRate = 0.05
  let userId: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
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
    // Fall through with default cashback rate
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

    // Attach Click IDs: appends tracking params to URLs and writes DB records
    // CRITICAL: Only results with successful DB inserts are returned
    const trackedResults = await attachClickIds(ranked, userId, requestIp, requestUserAgent)

    return NextResponse.json({ results: trackedResults })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
