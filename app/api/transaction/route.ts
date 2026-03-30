import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  let body: {
    productName?: string
    retailer?: string
    priceCents?: number
    commissionRate?: number
    commissionCents?: number
    processingFeeCents?: number
    userPayoutCents?: number
    estimatedCashbackCents?: number
    totalReturnCents?: number
    affiliateUrl?: string
    productUrl?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  if (!body.productName || !body.retailer || !body.affiliateUrl || !body.productUrl) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  if (typeof body.priceCents !== 'number' || body.priceCents <= 0) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const cookieStore = cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const row: Record<string, unknown> = {
    product_name: body.productName,
    retailer: body.retailer,
    price_cents: body.priceCents,
    commission_rate: body.commissionRate,
    commission_cents: body.commissionCents,
    processing_fee_cents: body.processingFeeCents,
    user_payout_cents: body.userPayoutCents,
    estimated_cashback_cents: body.estimatedCashbackCents,
    total_return_cents: body.totalReturnCents,
    affiliate_url: body.affiliateUrl,
    product_url: body.productUrl,
  }

  if (user) {
    row.user_id = user.id
  } else {
    const sessionToken = req.headers.get('X-Session-Token')
    if (sessionToken) row.session_token = sessionToken
  }

  const { data, error } = await serviceClient
    .from('transactions')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error('Transaction log error:', error)
    return NextResponse.json({ error: 'log_failed' }, { status: 500 })
  }

  return NextResponse.json({ transactionId: data.id })
}
