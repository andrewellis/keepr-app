import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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

  const { data: trackedItems } = await supabase
    .from('tracked_items')
    .select('id, title, min_observed_price, aggressive, last_checked_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('last_checked_at', { ascending: false })
    .limit(5)

  const serviceClient = createServiceClient()

  const { data: profilePayout } = await serviceClient
    .from('profiles')
    .select('payout_balance_cents, annual_cash_payout_cents, annual_cash_payout_year')
    .eq('id', user.id)
    .single()

  const balanceCents: number = (profilePayout as Record<string, unknown>)?.payout_balance_cents as number ?? 0
  const annualCents: number = (profilePayout as Record<string, unknown>)?.annual_cash_payout_cents as number ?? 0
  const annualYear: number = (profilePayout as Record<string, unknown>)?.annual_cash_payout_year as number ?? new Date().getFullYear()
  const currentYear = new Date().getFullYear()
  const effectiveAnnualCents = annualYear === currentYear ? annualCents : 0

  const { data: processingPayouts } = await serviceClient
    .from('payouts')
    .select('amount_cents')
    .eq('user_id', user.id)
    .eq('status', 'processing')

  const processingCents = (processingPayouts as { amount_cents: number }[] | null)?.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0) ?? 0

  const { data: completedPayouts } = await serviceClient
    .from('payouts')
    .select('amount_cents')
    .eq('user_id', user.id)
    .eq('status', 'completed')

  const totalEarnedCents = (completedPayouts as { amount_cents: number }[] | null)?.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0) ?? 0

  const { data: cardSelections } = await supabase
    .from('credit_card_selections')
    .select('id, card_id, is_primary')
    .eq('user_id', user.id)

  const cardIds = (cardSelections ?? []).map((s: { card_id: string }) => s.card_id)
  let cardDetails: { id: string; card_name: string; issuer: string; base_rate: number; reward_currency: string }[] = []
  if (cardIds.length > 0) {
    const { data: cards } = await supabase
      .from('credit_cards')
      .select('id, card_name, issuer, base_rate, reward_currency')
      .in('id', cardIds)
    cardDetails = (cards ?? []) as typeof cardDetails
  }

  const userCards = (cardSelections ?? []).map((s: { id: string; card_id: string; is_primary: boolean }) => {
    const card = cardDetails.find(c => c.id === s.card_id)
    return { selectionId: s.id, is_primary: s.is_primary, ...card }
  }).filter(c => c.card_name)

  function fmt(cents: number) {
    return '$' + (cents / 100).toFixed(2)
  }

  function relativeTimeServer(dateStr: string | null): string {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

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

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TRACKED ITEMS</p>
              <Link href="/tracking" style={{ fontSize: '11px', color: '#534AB7', fontWeight: 500, textDecoration: 'none' }}>See all →</Link>
            </div>
            {(!trackedItems || trackedItems.length === 0) ? (
              <div className="flex items-center justify-center py-6">
                <p style={{ fontSize: '12px', color: '#aaa' }}>No tracked items yet</p>
              </div>
            ) : (
              (trackedItems as { id: string; title: string; min_observed_price: number | null; aggressive: boolean; last_checked_at: string | null }[]).map((item, idx) => (
                <div key={item.id} style={{ borderBottom: idx < (trackedItems?.length ?? 0) - 1 ? '0.5px solid #f0f0f0' : 'none', padding: '10px 0' }}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{item.title}</p>
                      <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                        {item.aggressive ? 'Aggressive' : 'Standard'} · checked {relativeTimeServer(item.last_checked_at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {item.min_observed_price != null && (
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.min_observed_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 overflow-hidden">
            <RecentScans scans={scansFormatted} noMargins />
          </div>

          <div className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>EARNINGS</p>
              <Link href="/settings/payout" style={{ fontSize: '11px', color: '#534AB7', fontWeight: 500, textDecoration: 'none' }}>Payout settings →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div style={{ background: '#f8f8f6', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', color: '#aaa' }}>Balance</p>
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#111', marginTop: '2px' }}>{fmt(balanceCents)}</p>
              </div>
              <div style={{ background: '#f8f8f6', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', color: '#aaa' }}>Processing</p>
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#111', marginTop: '2px' }}>{fmt(processingCents)}</p>
              </div>
              <div style={{ background: '#f8f8f6', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', color: '#aaa' }}>All time</p>
                <p style={{ fontSize: '18px', fontWeight: 500, color: '#111', marginTop: '2px' }}>{fmt(totalEarnedCents)}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between" style={{ fontSize: '11px', color: '#aaa' }}>
                <span>Annual payouts ({currentYear})</span>
                <span>{fmt(effectiveAnnualCents)} of $600</span>
              </div>
              <div style={{ height: '4px', background: '#f0f0f0', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#534AB7', borderRadius: '2px', width: `${Math.min(100, (effectiveAnnualCents / 60000) * 100)}%` }} />
              </div>
              <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>IRS 1099 threshold</p>
            </div>
          </div>

          <div className="bg-white border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MY CARDS</p>
              <Link href="/settings" style={{ fontSize: '11px', color: '#534AB7', fontWeight: 500, textDecoration: 'none' }}>Manage cards →</Link>
            </div>
            {userCards.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <p style={{ fontSize: '12px', color: '#aaa' }}>No cards configured</p>
              </div>
            ) : (
              userCards.map((uc: { selectionId: string; is_primary: boolean; card_name?: string; issuer?: string; base_rate?: number; reward_currency?: string }, idx: number) => (
                <div key={uc.selectionId} style={{ borderBottom: idx < userCards.length - 1 ? '0.5px solid #f0f0f0' : 'none', padding: '10px 0' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{uc.card_name}</p>
                      <p style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{uc.issuer} · {uc.base_rate}% {uc.reward_currency}</p>
                    </div>
                    {uc.is_primary && (
                      <span style={{ fontSize: '10px', color: '#534AB7', fontWeight: 500, background: '#EEEDFE', padding: '2px 6px', borderRadius: '4px' }}>Primary</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div style={{ marginTop: '8px', padding: '10px', background: '#f8f8f6', borderRadius: '8px' }}>
              <p style={{ fontSize: '12px', color: '#aaa' }}>Card savings are applied automatically to scan results. Add more cards to improve recommendations.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
