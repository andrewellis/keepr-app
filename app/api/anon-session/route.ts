import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { anonId } = await req.json()
  if (!anonId) return NextResponse.json({ error: 'missing anonId' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // Try insert first (new session)
  const { error: insertError } = await supabase
    .from('anon_sessions')
    .insert({ id: anonId, last_seen: now, scan_count: 1 })

  if (insertError) {
    // Row exists — increment scan_count and update last_seen via raw SQL increment
    await supabase.rpc('increment_anon_scan', { p_id: anonId, p_last_seen: now })
      .then(async ({ error: rpcError }) => {
        if (rpcError) {
          // RPC not available yet — just update last_seen
          await supabase
            .from('anon_sessions')
            .update({ last_seen: now })
            .eq('id', anonId)
        }
      })
  }

  return NextResponse.json({ ok: true })
}
