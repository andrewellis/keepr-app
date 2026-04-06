import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export default function HowItWorksPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">How K33pr Works</h1>

      <div className="space-y-10">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Scan a Product</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground-secondary leading-relaxed pl-[52px]">
            <p>
              Visit k33pr.com and tap Scan. Point your camera at any product — a shoe,
              a gadget, a book, anything. Our image recognition identifies the product
              in seconds.
            </p>
            <p>
              Scan products at home that you want to repurchase, compare prices on, or
              find a better deal for.
            </p>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Compare Retailers</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground-secondary leading-relaxed pl-[52px]">
            <p>
              K33pr searches across multiple retailers — Amazon, Target, Macy&apos;s,
              Nordstrom, Nike, and more — to find where the product is available.
            </p>
            <p>
              Results are ranked by total return to you: the combination of affiliate
              cashback we pass to you plus your credit card&apos;s cashback rate.
            </p>
          </div>
        </section>

        {/* Step 3 */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">3</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Buy and Earn</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground-secondary leading-relaxed pl-[52px]">
            <p>
              Tap the retailer link to go directly to the product on their site.
              Complete your purchase normally.
            </p>
            <p>
              When the retailer confirms your purchase, we calculate your cashback and
              add it to your K33pr balance.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">4</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Get Paid</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground-secondary leading-relaxed pl-[52px]">
            <p>
              Once your balance reaches $5.00, we send your earnings via PayPal or
              Venmo. Set up your payout destination in Settings and the money comes
              to you.
            </p>
          </div>
        </section>

        {/* How We Make Money */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">How We Make Money</h2>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            K33pr earns affiliate commissions from retailers when you buy through our
            links. We keep a flat $0.20 per transaction to cover operating costs and
            pass the rest of the commission directly to you. That&apos;s it — no
            subscriptions, no premium tiers, no selling your data.
          </p>
        </section>

        {/* FAQ link */}
        <div>
          <Link
            href="/faq"
            className="text-sm text-primary font-medium hover:underline transition"
          >
            Have more questions? Check our FAQ →
          </Link>
        </div>

        {/* Blog link */}
        <div>
          <Link
            href="/blog/how-to-stack-cashback"
            className="text-sm font-medium hover:underline transition"
            style={{ color: '#534AB7' }}
          >
            Learn how to stack cashback for maximum savings →
          </Link>
        </div>
      </div>

      {/* Affiliate disclosure */}
      <AffiliateDisclosure />
    </div>
  )
}
