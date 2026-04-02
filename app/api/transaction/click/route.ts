import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  let body: { clickId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { clickId } = body
  if (!clickId) {
    return NextResponse.json({ error: 'clickId required' }, { status: 400 })
  }

  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tx, error: lookupError } = await serviceClient
    .from('transactions')
    .select('id, click_id, status, user_id')
    .eq('click_id', clickId)
    .single()

  if (lookupError || !tx) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (tx.status === 'clicked') {
    return NextResponse.json({ transactionId: tx.id, clickId: tx.click_id })
  }

  const updates: Record<string, unknown> = {
    status: 'clicked',
    link_clicked_at: new Date().toISOString(),
  }

  if (!tx.user_id && user) {
    updates.user_id = user.id
  }

  const { error: updateError } = await serviceClient
    .from('transactions')
    .update(updates)
    .eq('click_id', clickId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('[click] Failed to update transaction:', updateError)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ transactionId: tx.id, clickId: tx.click_id })
}
