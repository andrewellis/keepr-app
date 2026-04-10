import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import RecentScans from './RecentScans'
type StoredPayload = {
  shoppingResults?: { priceValue: number; price: string; merchant: string }[]
  serpResults?: { price: number | null; retailerDomain: string | null }[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getBestPrice(payload: unknown): { price: string; source: string } | null {
  const p = payload as StoredPayload
  if (p?.shoppingResults && p.shoppingResults.length > 0) {
    const sorted = [...p.shoppingResults].sort((a, b) => a.priceValue - b.priceValue)
    const best = sorted[0]
    return { price: best.price, source: best.merchant }
  }
  if (p?.serpResults && p.serpResults.length > 0) {
    const sorted = [...p.serpResults]
      .filter(r => r.price !== null)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    if (sorted.length > 0) {
      return {
        price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sorted[0].price!),
        source: sorted[0].retailerDomain ?? '',
      }
    }
  }
  return null
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

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Anonymous visitor — show landing page
  if (!user) {
    return (
      <div className="bg-background max-w-5xl mx-auto">
        {/* Hero section */}
        <section className="px-5 pt-16 pb-12 md:pt-12 md:pb-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4 md:text-center md:text-[40px] md:leading-[1.15]">
            Scan any product.<br />
            Find the best price.<br />
            Earn rewards.
          </h1>
          <p className="text-base md:text-lg text-foreground-secondary leading-relaxed mb-4 md:text-center md:max-w-[560px] md:mx-auto">
            K33pr compares prices across retailers and shows you where to buy for the
            most money back. Visit k33pr.com, point your camera at any product, and
            get started.
          </p>
          <p className="mb-8 md:text-center md:hidden">
            <Link
              href="/blog/how-to-stack-cashback"
              className="text-sm font-medium hover:underline transition"
              style={{ color: '#534AB7' }}
            >
              Learn how to stack savings →
            </Link>
          </p>
          <Link
            href="/scan"
            className="w-full bg-primary rounded-xl py-3.5 text-sm font-semibold text-white text-center hover:opacity-90 transition block md:hidden"
          >
            Start Scanning
          </Link>
          <p className="text-sm text-foreground-secondary mt-6 text-center md:hidden">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="hidden md:block text-sm text-foreground-secondary text-center mt-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-surface">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 3.5L5.5 10.5L3 7.5" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Try it — search in the nav bar above
            </span>
          </p>
        </section>

        {/* How it works summary */}
        <section className="px-5 pb-12">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 md:text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-3 md:gap-4">
            {/* Step 1 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="14" height="14" rx="2" stroke="white" strokeWidth="1.5"/><circle cx="10" cy="10" r="3" stroke="white" strokeWidth="1.5"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Scan</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Point your camera at any product. K33pr identifies it instantly using
                image recognition.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10h14M7 6l-4 4 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 6l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Compare</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                See prices across multiple retailers, ranked by how much money you
                get back.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="7" stroke="white" strokeWidth="1.5"/><path d="M10 6v4l3 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Earn</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Buy through K33pr and earn rewards on every purchase. We send your
                earnings via PayPal or Venmo.
              </p>
            </div>
          </div>
          <div className="mt-4 md:text-center">
            <Link
              href="/how-it-works"
              className="text-sm text-primary font-medium hover:underline transition"
            >
              Learn more about how it works →
            </Link>
          </div>
        </section>

        {/* Value proposition */}
        <section className="px-5 pb-12">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6 md:text-center">Why K33pr?</h2>
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4 gap-3">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                <h3 className="text-base font-semibold text-foreground">Real savings, real money</h3>
              </div>
              <p className="text-sm text-foreground-secondary leading-relaxed pl-5">
                K33pr pays you real cash via PayPal or Venmo — not points, not gift cards, not store credit.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                <h3 className="text-base font-semibold text-foreground">Multi-retailer comparison</h3>
              </div>
              <p className="text-sm text-foreground-secondary leading-relaxed pl-5">
                Searches Amazon, Target, Walmart, Macy&apos;s, Nordstrom, and more in a single scan to find where you save the most.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                <h3 className="text-base font-semibold text-foreground">No browser extension</h3>
              </div>
              <p className="text-sm text-foreground-secondary leading-relaxed pl-5">
                Works right in your browser at k33pr.com. No desktop extension, no toolbar, no tracking your browsing.
              </p>
            </div>
          </div>
        </section>

        {/* Affiliate disclosure */}
        <section className="px-5 pb-8">
          <AffiliateDisclosure />
        </section>
      </div>
    )
  }

  // Authenticated user — show dashboard
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

  // suppress unused import warning — signout is kept per requirements
  void signout

  return (
    <>
      {/* Mobile: existing dashboard */}
      <div className="md:hidden bg-background flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
        <div className="flex-shrink-0">
          <header className="pt-2 pb-3 px-5 flex items-center justify-between">
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
          <div className="bg-white border border-border rounded-2xl mx-5 mt-3 p-4">
            <p style={{ fontSize: '12px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              TOTAL SAVINGS
            </p>
            <p style={{ fontSize: '28px', fontWeight: 500, color: '#534AB7', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              $0.00
            </p>
            <div className="flex" style={{ borderTop: '1.5px solid #f0f0f0', paddingTop: '12px' }}>
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
        </div>
        <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <RecentScans scans={(recentScans ?? []).map(scan => ({ id: scan.id, product_name: scan.product_name, created_at: scan.created_at, topResults: getTopResults(scan.results_payload) }))} />
          <div style={{ height: '80px' }} />
        </div>
      </div>

      {/* Desktop: centered logo + search prompt */}
      <div className="hidden md:flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 65px)' }}>
        <div className="flex flex-col items-center" style={{ marginTop: '-60px' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: '#534AB7' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>What are you looking for?</h1>
          <p style={{ fontSize: '15px', color: '#999' }}>Search for any product in the bar above</p>
        </div>
      </div>
    </>
  )
}
