import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'How to Get the Most Out of Online Shopping Cashback in 2026 | K33pr',
  description:
    'A practical guide to maximizing cashback across retailers, cards, and affiliate programs.',
}

export default function OnlineShoppingCashbackGuidePage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/blog" className="text-sm hover:underline transition" style={{ color: '#534AB7' }}>
          ← Back to Blog
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        How to Get the Most Out of Online Shopping Cashback in 2026
      </h1>
      <p className="text-sm text-foreground-secondary mb-10">March 20, 2026</p>

      <div className="space-y-8 text-sm text-foreground-secondary leading-relaxed">
        <p>
          I&apos;ve talked to people who clip coupons religiously but have never set up a
          cashback card, and people who have three cashback apps installed but never
          checked if they stack. The system isn&apos;t complicated once you see how the
          pieces fit together — most people just never had anyone explain it clearly.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            The three sources of online shopping cashback
          </h2>
          <div className="space-y-5">
            <p>
              <strong className="text-foreground">Credit card rewards</strong> are the
              most consistent source. Your card earns a percentage on every purchase
              regardless of where you shop. Rates vary by card and spending category —
              typically 1-6% depending on how well the card matches the purchase type.
            </p>
            <p>
              <strong className="text-foreground">Affiliate cashback programs</strong>{' '}
              work by routing purchases through a referral link. The retailer pays a
              commission to the referring site, which passes some or all of it back to the
              user. K33pr operates this way — keeping $0.20 per transaction and returning
              the rest. Commission rates vary significantly by retailer and product
              category, from under 1% on some electronics to 8% or more on apparel and
              home goods.
            </p>
            <p>
              <strong className="text-foreground">Retailer loyalty programs</strong> are a
              third layer some shoppers use — points programs at specific retailers like
              Target Circle or Kohl&apos;s Cash. These stack with the other two in most
              cases but require managing separate accounts and redeeming in
              retailer-specific currency.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            What actually stacks and what doesn&apos;t
          </h2>
          <p>
            Credit card rewards and affiliate cashback always stack — they&apos;re paid by
            different parties. Card rewards come from your bank. Affiliate commissions come
            from the retailer&apos;s marketing budget. There&apos;s no conflict.
          </p>
          <p className="mt-4">
            Retailer loyalty points usually stack with both, but some retailers exclude
            purchases made through affiliate links from their loyalty programs. Target
            Circle, for example, does not always credit loyalty points on purchases
            originating from affiliate links. Check the retailer&apos;s terms before
            assuming all three stack.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Where the biggest gains are
          </h2>
          <p>
            The highest combined returns tend to come from mid-size retailers rather than
            Amazon. Large platforms like Amazon negotiate lower affiliate commission rates
            because of their volume. Specialty retailers in apparel, home goods, and beauty
            often pay 6-8% affiliate commissions — significantly higher than Amazon&apos;s
            1-4% on most categories.
          </p>
          <p className="mt-4">
            Pairing a high-commission retailer with a card that has a relevant elevated
            category rate is where the math gets interesting. A clothing retailer paying 7%
            affiliate commission plus a card earning 3% on online shopping returns 10% on a
            purchase. The same item on Amazon might return 3% affiliate plus 5% card —
            also 10%, but from a different combination.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            The practical approach
          </h2>
          <p>
            The simplest system: use K33pr to identify the product and surface the total
            return per retailer, add your cards in Settings once, and let the site
            calculate the best combination automatically.
          </p>
          <p className="mt-4">
            The goal isn&apos;t to turn shopping into a spreadsheet exercise. It&apos;s to
            set things up once — the right card saved, your cashback programs linked — and
            then just buy things the way you normally would, knowing you&apos;re not
            leaving 5-8% on the table every time.
          </p>
        </section>

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

      <AffiliateDisclosure />
    </div>
  )
}
