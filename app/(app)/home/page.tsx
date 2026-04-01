import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export default async function HomePage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Anonymous visitor — show landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground-secondary">Good day,</p>
          <h1 className="text-2xl font-bold text-foreground">{firstName} 👋</h1>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="text-xs text-foreground-secondary border border-border rounded-lg px-3 py-1.5 hover:border-primary hover:text-primary transition"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Balance card */}
      <div className="mx-5 mt-2 bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm text-foreground-secondary mb-1">Total Earnings</p>
        <p className="text-4xl font-bold text-foreground">$0.00</p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">This Week</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">$0.00</p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">This Month</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">$0.00</p>
          </div>
          <div className="flex-1 bg-background rounded-xl p-3 text-center">
            <p className="text-xs text-foreground-secondary">Pending</p>
            <p className="text-lg font-semibold text-primary mt-0.5">$0.00</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mx-5 mt-5">
        <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/scan"
            className="bg-primary rounded-2xl p-5 flex flex-col gap-2 hover:opacity-90 transition"
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3m2 8H3m18-8h-2M5 4H3m2 16H3m18-4h-2M19 4h-2" />
            </svg>
            <span className="text-sm font-semibold text-white">Scan Product</span>
          </a>
          <a
            href="/history"
            className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-2 hover:border-primary transition"
          >
            <svg className="w-7 h-7 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-sm font-semibold text-foreground">View History</span>
          </a>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="mx-5 mt-5">
        <h2 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-3">
          Recent Activity
        </h2>
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-foreground-secondary text-sm">No items scanned yet.</p>
          <p className="text-foreground-secondary text-xs mt-1">Scan a product to get started.</p>
        </div>
      </div>
    </div>
  )
}
