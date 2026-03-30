import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
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
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sessionToken = req.headers.get('X-Session-Token')
  if (!sessionToken) {
    return NextResponse.json({ error: 'missing session token' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await serviceClient
    .from('transactions')
    .update({ user_id: user.id })
    .eq('session_token', sessionToken)
    .is('user_id', null)
    .select('id')

  if (error) {
    console.error('migrate-session error:', error)
    return NextResponse.json({ error: 'migration_failed' }, { status: 500 })
  }

  const migratedCount = data?.length ?? 0

  try {
    await serviceClient.from('audit_log').insert({
      event_type: 'session_migrated',
      metadata: { session_token: sessionToken, migrated_count: migratedCount },
    })
  } catch {}

  return NextResponse.json({ migrated: migratedCount })
}
