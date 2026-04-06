import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import ScanBar from './ScanBar'

type StoredPayload = {
  shoppingResults?: { priceValue: number; price: string; merchant: string }[]
  serpResults?: { price: number | null; retailerDomain: string | null }[]
}

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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Anonymous visitor — show landing page
  if (!user) {
    return (
      <div className="bg-background">
        {/* Hero section */}
        <section className="px-5 pt-16 pb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
            Scan any product.<br />
            Find the best price.<br />
            Earn cashback.
          </h1>
          <p className="text-base text-foreground-secondary leading-relaxed mb-4">
            K33pr compares prices across retailers and shows you where to buy for the
            most money back. Visit k33pr.com, point your camera at any product, and
            get started.
          </p>
          <p className="mb-8">
            <Link
              href="/blog/how-to-stack-cashback"
              className="text-sm font-medium hover:underline transition"
              style={{ color: '#534AB7' }}
            >
              Learn how to stack cashback for maximum savings →
            </Link>
          </p>
          <Link
            href="/scan"
            className="w-full bg-primary rounded-xl py-3.5 text-sm font-semibold text-white text-center hover:opacity-90 transition block"
          >
            Start Scanning
          </Link>
          <p className="text-sm text-foreground-secondary mt-6 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </section>

        {/* Product screenshot */}
        <div className="px-5 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/results-example.png"
            alt="K33pr results showing product identification, price comparison, and credit card recommendation"
            className="w-full max-w-[700px] mx-auto rounded-lg shadow-sm"
            style={{ border: '1px solid #E5E5E3' }}
          />
          <p className="text-center text-sm mt-3" style={{ color: '#666666' }}>
            Scan any product. See prices, cashback, and your best card — all in one place.
          </p>
        </div>

        {/* How it works summary */}
        <section className="px-5 pb-12">
          <h2 className="text-xl font-bold text-foreground mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Scan</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Point your camera at any product. K33pr identifies it instantly using
                image recognition.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Compare</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                See prices across multiple retailers, ranked by how much money you
                get back.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mb-3">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">Earn</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Buy through K33pr and earn cashback on every purchase. We send your
                earnings via PayPal or Venmo.
              </p>
            </div>
          </div>
          <div className="mt-4">
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
          <h2 className="text-xl font-bold text-foreground mb-6">Why K33pr?</h2>
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                Real cashback, real money
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Unlike coupon sites that give you points or gift cards, K33pr pays you
                real cash via PayPal or Venmo.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                Multi-retailer comparison
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                We don&apos;t just check one store. K33pr searches across Amazon, Target,
                Macy&apos;s, Nordstrom, and more to find where you save the most.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-1.5">
                No browser extension required
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                K33pr works right in your browser. No desktop extension, no toolbar,
                no tracking your browsing. Just visit k33pr.com and start scanning.
              </p>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <section className="px-5 pb-4">
          <div className="flex items-center justify-center gap-4">
            <Link href="/how-it-works" className="text-xs text-foreground-secondary hover:text-primary transition">
              How It Works
            </Link>
            <span className="text-xs text-foreground-secondary">·</span>
            <Link href="/faq" className="text-xs text-foreground-secondary hover:text-primary transition">
              FAQ
            </Link>
            <span className="text-xs text-foreground-secondary">·</span>
            <Link href="/privacy" className="text-xs text-foreground-secondary hover:text-primary transition">
              Privacy Policy
            </Link>
            <span className="text-xs text-foreground-secondary">·</span>
            <Link href="/terms" className="text-xs text-foreground-secondary hover:text-primary transition">
              Terms of Service
            </Link>
            <span className="text-xs text-foreground-secondary">·</span>
            <Link href="/about" className="text-xs text-foreground-secondary hover:text-primary transition">
              About
            </Link>
            <span className="text-xs text-foreground-secondary">·</span>
            <Link href="/blog" className="text-xs text-foreground-secondary hover:text-primary transition">
              Blog
            </Link>
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
    .limit(4)

  // suppress unused import warning — signout is kept per requirements
  void signout

  return (
    <div className="bg-background">
      {/* Greeting header */}
      <header className="pt-4 pb-3 px-5 flex items-center justify-between">
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

      {/* Savings card */}
      <div className="bg-white border border-border rounded-2xl mx-5 mt-3 p-4">
        <p style={{ fontSize: '10px', color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
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

      {/* Recent scans section */}
      <div className="mx-5 mt-4 flex items-center justify-between">
        <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          RECENT SCANS
        </p>
        <Link href="/history" style={{ fontSize: '11px', color: '#534AB7' }}>
          See all
        </Link>
      </div>

      <div className="bg-white border border-border rounded-2xl mx-5 overflow-hidden" style={{ marginTop: '8px' }}>
        {!recentScans || recentScans.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p style={{ fontSize: '12px', color: '#aaa' }}>No scans yet</p>
          </div>
        ) : (
          recentScans.map((scan, i) => {
            const best = getBestPrice(scan.results_payload)
            const isLast = i === recentScans.length - 1
            return (
              <div
                key={scan.id}
                className="flex items-center gap-2 px-3"
                style={{
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                }}
              >
                {/* Dot */}
                <div
                  className="flex-shrink-0"
                  style={{ width: '4px', height: '4px', borderRadius: '9999px', backgroundColor: '#534AB7' }}
                />
                {/* Middle */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}
                  >
                    {scan.product_name}
                  </p>
                  {best && (
                    <p style={{ fontSize: '11px', color: '#aaa' }}>
                      {best.source} · {best.price}
                    </p>
                  )}
                </div>
                {/* Relative time */}
                <p className="flex-shrink-0" style={{ fontSize: '10px', color: '#ccc' }}>
                  {relativeTime(scan.created_at)}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom scan bar */}
      <ScanBar />
    </div>
  )
}
