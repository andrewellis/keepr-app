import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()

  const { data: transactions, error } = await serviceClient
    .from('transactions')
    .select(`
      id,
      click_id,
      product_name,
      retailer,
      price_cents,
      commission_rate,
      commission_cents,
      user_payout_cents,
      status,
      commission_status,
      payout_held_until,
      payout_hold_released,
      link_clicked_at,
      confirmed_at,
      paid_at,
      created_at,
      payouts (
        id,
        amount_cents,
        status,
        created_at,
        completed_at
      )
    `)
    .eq('user_id', user.id)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[history] Failed to fetch transactions:', error)
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({ transactions: transactions ?? [] })
}
