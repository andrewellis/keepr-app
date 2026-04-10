import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'Cashback vs. Coupons: Which Saves You More? | K33pr',
  description:
    'Coupons and cashback both reduce what you pay — but they work differently and one usually wins.',
}

export default function CashbackVsCouponsPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[600px] mx-auto md:pt-16">
      <div className="mb-6">
        <Link href="/blog" className="text-xs md:text-sm text-primary font-medium hover:underline transition">
          ← Back to blog
        </Link>
      </div>
      <h1 className="text-xl md:text-[26px] font-bold text-foreground mb-2">
        Cashback vs. Coupons: Which Saves You More?
      </h1>
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xs text-foreground-secondary">March 28, 2026</span>
        <span className="text-xs text-foreground-secondary">&middot;</span>
        <span className="text-xs text-foreground-secondary">4 min read</span>
      </div>

      <div className="space-y-8 text-sm md:text-[14px] text-foreground-secondary leading-relaxed">
        <p>
          There&apos;s a version of this debate that gets religious. Coupon people think
          cashback is lazy. Cashback people think hunting for codes is a waste of time.
          They&apos;re both partially right, but the more useful question is when each one
          is worth your attention.
        </p>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            How coupons work
          </h2>
          <p>
            A coupon reduces the purchase price before you pay. You present the code at
            checkout and the discount is applied immediately — you see the lower number on
            your receipt. The savings are certain and visible upfront.
          </p>
          <p className="mt-4">
            The downsides are practical: coupons expire, they&apos;re often category or
            product specific, and finding valid ones takes time. Coupon aggregator sites
            help but their databases go stale quickly. A significant portion of codes
            listed on coupon sites are expired or never worked to begin with.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            How cashback works
          </h2>
          <p>
            Cashback reduces the effective price after the fact. You pay full price at
            checkout and receive a percentage back later — either through your credit card
            statement, a PayPal transfer, or a check. The savings are real but delayed,
            and they depend on the transaction being confirmed and processed correctly.
          </p>
          <p className="mt-4">
            The upside is consistency. A 3% cashback rate on a retailer applies to every
            purchase at that retailer, regardless of what you&apos;re buying. You
            don&apos;t have to search for a code or hope one works. The rate is known
            before you buy.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            Which saves more
          </h2>
          <p>
            On a single transaction, a good coupon code beats a typical cashback rate. A
            20% off code on a $100 item saves $20. A 5% cashback rate saves $5. The coupon
            wins by a significant margin.
          </p>
          <p className="mt-4">
            The comparison shifts when you factor in reliability and frequency. Valid
            coupon codes for specific items you actually want to buy are relatively rare.
            Cashback applies to every purchase automatically. Over a year of regular
            shopping, consistent 3-5% cashback on purchases you were already making often
            outpaces the occasional coupon find.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            The case for combining them
          </h2>
          <p>
            Coupons and cashback aren&apos;t mutually exclusive. A coupon reduces the
            purchase price; cashback is calculated on whatever you pay. If you have a 10%
            off coupon on a $100 item and a 5% cashback rate, you pay $90 and get $4.50
            back — saving $14.50 total.
          </p>
          <p className="mt-4">
            The practical constraint is that valid coupons for your specific purchase are
            hard to find consistently. Cashback is always available. The most reliable
            strategy is to always use cashback as a baseline and treat coupons as a bonus
            when they&apos;re legitimately available.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            Where K33pr fits
          </h2>
          <p>
            K33pr surfaces affiliate savings rates across multiple retailers so you can
            see the best available return before you click. It doesn&apos;t currently
            surface coupon codes — affiliate commission rates are the primary savings lever
            the site optimizes for. Stacking those rates with your credit card cashback is
            where the consistent savings come from.
          </p>
          <p className="mt-4">
            If you only have bandwidth for one system, make it cashback. It requires almost
            no ongoing effort and applies to everything. Coupons are worth grabbing when
            they fall in your lap — a code in a confirmation email, a discount at checkout
            — but building your savings strategy around hunting for them is a losing time
            trade for most people.
          </p>
        </section>

        <Link href="/scan" className="block p-5 bg-primary rounded-xl mb-8 mt-8 hover:opacity-90 transition">
          <p className="text-sm font-medium text-white mb-1">Try it yourself</p>
          <p className="text-xs text-white/75">Scan a product to see your total return across retailers →</p>
        </Link>
      </div>

      <div className="border-t border-border pt-6 mt-4">
        <p className="text-[11px] text-foreground-secondary uppercase tracking-wider mb-4">More from the blog</p>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
          <Link href="/blog/how-to-stack-cashback" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">How to stack cashback</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Combine affiliate savings with credit card rewards.</p>
          </Link>
          <Link href="/blog/best-cards-for-amazon" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">Best cards for Amazon</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Top cards and how to pick the right one.</p>
          </Link>
          <Link href="/blog/online-shopping-cashback-guide" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">Online shopping cashback guide</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Maximize cashback across retailers in 2026.</p>
          </Link>
        </div>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
