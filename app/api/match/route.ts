import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchAmazon } from '@/lib/affiliates/amazon'

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
    const results = await searchAmazon(searchTerms, category, cashbackRate)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('Match error:', err)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
