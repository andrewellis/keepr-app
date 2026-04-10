import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import EditDisplayName from './EditDisplayName'
import CardSettings from './CardSettings'

export default async function SettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const chevron = (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="#ccc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5l3 3.5-3 3.5" />
    </svg>
  )

  const sectionLabel = (text: string) => (
    <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 20, marginBottom: 6, marginTop: 16 }}>
      {text}
    </div>
  )

  const card = { background: '#fff', border: '0.5px solid #ebebeb', borderRadius: 12, marginLeft: 16, marginRight: 16, overflow: 'hidden' } as const
  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' } as const
  const rowLabel = { fontSize: 13, color: '#111' } as const
  const rowValue = { fontSize: 13, color: '#aaa' } as const
  const divider = { height: 0.5, background: '#f0f0f0', marginLeft: 14, marginRight: 14 } as const

  return (
    <div style={{ backgroundColor: '#f8f8f8', minHeight: '100vh', paddingBottom: 100, paddingTop: 8 }}>
      <div style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>

      {/* PROFILE — no section label */}
      <div style={card}>
        <EditDisplayName currentName={profile?.display_name ?? ''} />
        <div style={divider} />
        <div style={row}>
          <span style={rowLabel}>Email</span>
          <span style={{ ...rowValue, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </span>
        </div>
      </div>

      {/* MY CARDS */}
      {sectionLabel('My Cards')}
      <div style={card}>
        <div style={{ padding: '12px 14px' }}>
          <CardSettings />
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {sectionLabel('Notifications')}
      <div style={card}>
        <div style={row}>
          <span style={rowLabel}>Price drop alerts</span>
          <span style={{ fontSize: 13, color: '#ccc' }}>Coming soon</span>
        </div>
        <div style={divider} />
        <div style={row}>
          <span style={rowLabel}>90-day low alerts</span>
          <span style={{ fontSize: 13, color: '#ccc' }}>Coming soon</span>
        </div>
        <div style={divider} />
        <div style={row}>
          <span style={rowLabel}>Cashback updates</span>
          <span style={{ fontSize: 13, color: '#ccc' }}>Coming soon</span>
        </div>
      </div>

      {/* ACCOUNT */}
      {sectionLabel('Account')}
      <div style={card}>
        <a href="/settings/payout" style={{ textDecoration: 'none' }}>
          <div style={row}>
            <span style={rowLabel}>PayPal</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {profile?.payout_destination ? (
                <span style={{ fontSize: 13, color: '#1D9E75' }}>Connected</span>
              ) : (
                <span style={rowValue}>Not configured</span>
              )}
              {chevron}
            </div>
          </div>
        </a>
        <div style={divider} />
        <Link href="/settings/import" style={{ textDecoration: 'none' }}>
          <div style={row}>
            <span style={rowLabel}>Import Orders</span>
            {chevron}
          </div>
        </Link>
        <div style={divider} />
        <a href="/privacy" style={{ textDecoration: 'none' }}>
          <div style={row}>
            <span style={rowLabel}>Privacy Policy</span>
            {chevron}
          </div>
        </a>
        <div style={divider} />
        <a href="/how-it-works" style={{ textDecoration: 'none' }}>
          <div style={row}>
            <span style={rowLabel}>Help</span>
            {chevron}
          </div>
        </a>
      </div>

      {/* SIGN OUT — no section label */}
      <div style={{ ...card, marginTop: 16 }}>
        <form action={signout}>
          <button
            type="submit"
            style={{ width: '100%', textAlign: 'left', padding: '12px 14px', fontSize: 13, fontWeight: 500, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </form>
      </div>

      {/* VERSION */}
      <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 16 }}>
        v0.3.0
      </div>

      </div>
    </div>
  )
}
