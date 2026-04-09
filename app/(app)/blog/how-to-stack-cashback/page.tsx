import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'How to Stack Cashback: Affiliate Commissions + Credit Card Rewards | K33pr',
  description:
    "Affiliate cashback and credit card rewards are paid by different parties — which means you can collect both on the same purchase. Here's how.",
}

export default function HowToStackCashbackPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/blog" className="text-sm hover:underline transition" style={{ color: '#534AB7' }}>
          ← Back to Blog
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        How to Stack Cashback: Affiliate Commissions + Credit Card Rewards
      </h1>
      <p className="text-sm text-foreground-secondary mb-10">March 1, 2026</p>

      <div className="space-y-8 text-sm text-foreground-secondary leading-relaxed">
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

        {/* Section 1 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
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

        {/* Section 2 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
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

        {/* Section 3 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
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

        {/* Section 4 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            How K33pr figures out your best combination
          </h2>
          <p>
            When you scan a product, K33pr identifies the category and checks which of
            your saved cards pays the highest rate for that type of purchase. It shows the
            combined total return next to each retailer so you can see the full picture
            before you click anything.
          </p>
        </section>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E5E5E3]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E3]">
                <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Retailer</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">K33pr Savings</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Card Cashback</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Total Return</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#E5E5E3]">
                <td className="px-4 py-3 text-[#1a1a1a]">Amazon</td>
                <td className="px-4 py-3 text-[#666666]">3%</td>
                <td className="px-4 py-3 text-[#666666]">5% (Chase Freedom Flex)</td>
                <td className="px-4 py-3 font-semibold text-[#534AB7]">8%</td>
              </tr>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E3]">
                <td className="px-4 py-3 text-[#1a1a1a]">Target</td>
                <td className="px-4 py-3 text-[#666666]">7%</td>
                <td className="px-4 py-3 text-[#666666]">3% (Capital One SavorOne)</td>
                <td className="px-4 py-3 font-semibold text-[#534AB7]">10%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[#1a1a1a]">ASOS</td>
                <td className="px-4 py-3 text-[#666666]">6%</td>
                <td className="px-4 py-3 text-[#666666]">1% (base rate)</td>
                <td className="px-4 py-3 font-semibold text-[#534AB7]">7%</td>
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

        {/* CTA */}
        <div className="pt-2">
          <Link
            href="/scan"
            className="text-sm font-medium hover:underline transition"
            style={{ color: '#534AB7' }}
          >
            Try K33pr — scan a product to see your total return →
          </Link>
        </div>
      </div>

      {/* Affiliate disclosure */}
      <div className="mt-12 mb-6 px-1">
        <p className="text-xs text-center leading-relaxed text-foreground-secondary">
          K33pr earns affiliate commissions when you purchase through our links. This is
          how we fund your savings.
        </p>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
