import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecentScans from '../home/RecentScans'

type StoredPayload = {
  shoppingResults?: { priceValue: number; price: string; merchant: string }[]
  serpResults?: { price: number | null; retailerDomain: string | null }[]
}

function getTopResults(payload: unknown): { price: string; source: string; priceNum: number }[] {
  const p = payload as StoredPayload
  const results: { price: string; source: string; priceNum: number }[] = []
  if (p?.shoppingResults) {
    for (const r of p.shoppingResults) {
      results.push({ price: r.price, source: r.merchant, priceNum: r.priceValue })
    }
  }
  if (p?.serpResults) {
    for (const r of p.serpResults) {
      if (r.price !== null) {
        results.push({
          price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.price),
          source: r.retailerDomain ?? '',
          priceNum: r.price,
        })
      }
    }
  }
  results.sort((a, b) => a.priceNum - b.priceNum)
  return results.slice(0, 3)
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name ?? user.email ?? 'there'
  const firstName = displayName.split(' ')[0]

  const { count: trackedCount } = await supabase
    .from('tracked_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const { data: recentScans } = await supabase
    .from('scan_history')
    .select('id, product_name, created_at, results_payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const scansFormatted = (recentScans ?? []).map((scan: { id: string; product_name: string; created_at: string; results_payload: unknown }) => ({
    id: scan.id,
    product_name: scan.product_name,
    created_at: scan.created_at,
    topResults: getTopResults(scan.results_payload),
  }))

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto px-5 md:px-8 pt-4 md:pt-8 pb-24 md:pb-8">

        <header className="pb-3 flex items-center justify-between">
          <div>
            <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              GOOD DAY
            </p>
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#111' }}>{firstName}</p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: '11px', color: '#aaa' }}>{today}</p>
            <p style={{ fontSize: '11px', color: '#534AB7', fontWeight: 500 }}>
              {trackedCount ?? 0} tracked
            </p>
          </div>
        </header>

        <div className="bg-white border border-border rounded-2xl p-4 mt-3">
          <p style={{ fontSize: '12px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            TOTAL SAVINGS
          </p>
          <p style={{ fontSize: '28px', fontWeight: 500, color: '#534AB7', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            $0.00
          </p>
          <div className="flex md:grid md:grid-cols-3" style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '12px' }}>
            <div className="flex-1 text-center">
              <p style={{ fontSize: '9px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>THIS WEEK</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>$0.00</p>
            </div>
            <div className="flex-1 text-center">
              <p style={{ fontSize: '9px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>THIS MONTH</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>$0.00</p>
            </div>
            <div className="flex-1 text-center">
              <p style={{ fontSize: '9px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ALL TIME</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>$0.00</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <RecentScans scans={scansFormatted} />
        </div>

      </div>
    </div>
  )
}
