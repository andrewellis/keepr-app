import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'How to Stack Cashback: Affiliate Commissions + Credit Card Rewards | K33pr',
  description:
    "Affiliate cashback and credit card rewards are paid by different parties — which means you can collect both on the same purchase. Here's how.",
}

export default function HowToStackCashbackPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[600px] mx-auto md:pt-16">
      <div className="mb-6">
        <Link href="/blog" className="text-xs md:text-sm text-primary font-medium hover:underline transition">
          ← Back to blog
        </Link>
      </div>
      <h1 className="text-xl md:text-[26px] font-bold text-foreground mb-2">
        How to Stack Cashback: Affiliate Commissions + Credit Card Rewards
      </h1>
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xs text-foreground-secondary">March 1, 2026</span>
        <span className="text-xs text-foreground-secondary">&middot;</span>
        <span className="text-xs text-foreground-secondary">4 min read</span>
      </div>

      <div className="space-y-8 text-sm md:text-[14px] text-foreground-secondary leading-relaxed">
        <p>
          There&apos;s a quirk in how cashback works that most people never take advantage
          of. Affiliate cashback programs and credit card rewards are paid by completely
          different parties — the retailer on one side, your card issuer on the other.
          Because they don&apos;t know about each other, you can collect both on the same
          purchase.
        </p>

        <p>
          Most people stumble onto this by accident — they notice their card statement
          shows cashback on a purchase they also got affiliate credit for, and realize the
          two never cancelled out. Once you know it works that way, it&apos;s hard to shop
          any other way.
        </p>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            What affiliate cashback actually is
          </h2>
          <p>
            When a site sends you to a retailer and you buy something, the retailer pays
            that site a referral fee. It&apos;s built into the retailer&apos;s marketing
            budget — you&apos;d pay the same price either way. K33pr collects that fee and
            sends most of it back to you, keeping $0.20 per transaction to cover costs.
            Depending on the retailer and product category, that&apos;s typically 1–8% of
            what you spent.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            What your credit card is already doing
          </h2>
          <p>
            Your card is running its own cashback calculation in the background on every
            purchase. Most cards pay a flat 1–2% on everything, but the better ones pay
            elevated rates in specific categories. The Chase Freedom Flex pays 3% at
            drugstores and on dining. The Amex Blue Cash Preferred pays 6% at US
            supermarkets. If you&apos;re not matching your card to the category you&apos;re
            buying in, you&apos;re probably leaving 2–4% on the table regularly.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            Why these two stack
          </h2>
          <p>
            Since the affiliate commission comes from the retailer&apos;s marketing budget
            and the card reward comes from your bank, they don&apos;t conflict or cancel
            each other out. A $100 purchase through a K33pr link at a retailer paying 5%
            commission, made with a card earning 3% in that category, puts $8 back in your
            pocket — $5 from K33pr after the fee, $3 from your card issuer. Neither party
            knows or cares about the other.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            How K33pr figures out your best combination
          </h2>
          <p>
            When you scan a product, K33pr identifies the category and checks which of
            your saved cards pays the highest rate for that type of purchase. It shows the
            combined total return next to each retailer so you can see the full picture
            before you click anything.
          </p>
        </section>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Retailer</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">K33pr Savings</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Card Cashback</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Total Return</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-foreground">Amazon</td>
                <td className="px-4 py-3 text-foreground-secondary">3%</td>
                <td className="px-4 py-3 text-foreground-secondary">5% (Chase Freedom Flex)</td>
                <td className="px-4 py-3 font-semibold text-primary">8%</td>
              </tr>
              <tr className="bg-surface border-b border-border">
                <td className="px-4 py-3 text-foreground">Target</td>
                <td className="px-4 py-3 text-foreground-secondary">7%</td>
                <td className="px-4 py-3 text-foreground-secondary">3% (Capital One SavorOne)</td>
                <td className="px-4 py-3 font-semibold text-primary">10%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-foreground">ASOS</td>
                <td className="px-4 py-3 text-foreground-secondary">6%</td>
                <td className="px-4 py-3 text-foreground-secondary">1% (base rate)</td>
                <td className="px-4 py-3 font-semibold text-primary">7%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          In this example Target beats Amazon on total return despite Amazon&apos;s brand
          familiarity — because Target&apos;s affiliate rate is higher and the
          SavorOne&apos;s category rate applies.
        </p>

        <p>
          The math isn&apos;t complicated, but it does require knowing your cards and
          checking rates across retailers before you buy. That&apos;s what K33pr is built
          to do automatically — so you get the combined return without having to think
          about it every time.
        </p>

        <Link href="/scan" className="block p-5 bg-primary rounded-xl mb-8 mt-8 hover:opacity-90 transition">
          <p className="text-sm font-medium text-white mb-1">Try it yourself</p>
          <p className="text-xs text-white/75">Scan a product to see your total return across retailers →</p>
        </Link>
      </div>

      <div className="border-t border-border pt-6 mt-4">
        <p className="text-[11px] text-foreground-secondary uppercase tracking-wider mb-4">More from the blog</p>
        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
          <Link href="/blog/best-cards-for-amazon" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">Best cards for Amazon</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Top cards and how to pick the right one.</p>
          </Link>
          <Link href="/blog/online-shopping-cashback-guide" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">Online shopping cashback guide</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Maximize cashback across retailers in 2026.</p>
          </Link>
          <Link href="/blog/cashback-vs-coupons" className="block bg-surface border border-border rounded-lg p-3.5 hover:border-primary transition">
            <p className="text-[13px] font-medium text-foreground mb-1">Cashback vs. coupons</p>
            <p className="text-[11px] text-foreground-secondary leading-snug">Which one saves more over time.</p>
          </Link>
        </div>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
