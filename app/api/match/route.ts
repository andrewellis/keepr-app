import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveNetworks } from '@/lib/affiliates/registry'
import { rankResults } from '@/lib/affiliates/ranker'
import type { AffiliateResult } from '@/lib/affiliates/types'

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

  // Read cashback_rate from user profile if authenticated
  let cashbackRate = 0.05
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
      networks.map((searchFn) =>
        Promise.race<AffiliateResult[]>([
          searchFn(searchTerms, category, cashbackRate),
          new Promise<AffiliateResult[]>((resolve) =>
            setTimeout(() => {
              console.warn(
                `[match] Affiliate network timed out after ${NETWORK_TIMEOUT_MS}ms`
              )
              resolve([])
            }, NETWORK_TIMEOUT_MS)
          ),
        ]).catch((err) => {
          console.warn('[match] Affiliate network error:', err)
          return [] as AffiliateResult[]
        })
      )
    )

    // Flatten all results and run through ranker
    const allResults = settled.flat()
    const ranked = rankResults(allResults)

    return NextResponse.json({ results: ranked })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
