import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'Which Credit Cards Give the Most Cashback on Amazon Purchases? | K33pr',
  description:
    'A breakdown of the top cards for Amazon shopping and how to pick the right one for your spending habits.',
}

export default function BestCardsForAmazonPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[600px] mx-auto md:pt-16">
      <div className="mb-6">
        <Link href="/blog" className="text-xs md:text-sm text-primary font-medium hover:underline transition">
          ← Back to blog
        </Link>
      </div>
      <h1 className="text-xl md:text-[26px] font-bold text-foreground mb-2">
        Which Credit Cards Give the Most Cashback on Amazon Purchases?
      </h1>
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xs text-foreground-secondary">March 10, 2026</span>
        <span className="text-xs text-foreground-secondary">&middot;</span>
        <span className="text-xs text-foreground-secondary">4 min read</span>
      </div>

      <div className="space-y-8 text-sm md:text-[14px] text-foreground-secondary leading-relaxed">
        <p>
          Most people just use whatever card is in their wallet when they check out on
          Amazon. It works, but depending on the card, you might be earning 1% on
          purchases where you could be earning 5%. That gap adds up fast if you shop on
          Amazon regularly.
        </p>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            Cards with elevated rates for Amazon purchases
          </h2>
          <div className="space-y-5">
            <p>
              <strong className="text-foreground">Chase Amazon Prime Visa</strong> pays
              5% back on Amazon and Whole Foods purchases. It requires an active Prime
              membership and has no annual fee beyond the Prime subscription cost. For
              frequent Amazon shoppers this is the most straightforward option — the
              elevated rate applies automatically with no category activation required.
            </p>
            <p>
              <strong className="text-foreground">Amex Blue Cash Preferred</strong> pays
              6% on US supermarkets and 6% on select streaming, but only 1% on general
              online shopping including Amazon. It&apos;s a strong grocery card but not
              optimized for Amazon specifically.
            </p>
            <p>
              <strong className="text-foreground">Chase Freedom Flex</strong> pays 5% on
              rotating quarterly categories, which occasionally includes Amazon.com or
              online shopping broadly. The catch is that you have to activate the category
              each quarter and the elevated rate applies only up to $1,500 in combined
              spending.
            </p>
            <p>
              <strong className="text-foreground">Citi Double Cash</strong> pays a flat
              2% on everything — 1% when you buy and 1% when you pay. No category
              tracking required. For Amazon purchases that don&apos;t fall into a
              card&apos;s elevated category, 2% flat often beats 1% elevated.
            </p>
            <p>
              <strong className="text-foreground">Capital One Quicksilver</strong> pays
              1.5% flat on all purchases with no annual fee. Simpler than the Double Cash
              but slightly lower return.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">How to decide</h2>
          <p>
            If you buy from Amazon more than twice a month, the Chase Amazon Prime Visa is
            difficult to beat for Amazon-specific spending. If your Amazon spending is
            moderate and you want one card for everything, the Citi Double Cash at 2% flat
            is more practical.
          </p>
          <p className="mt-4">
            The mistake most people make is using a travel rewards card for Amazon
            purchases. Cards like the Chase Sapphire Reserve earn 1% on non-travel,
            non-dining purchases — which means Amazon spending earns at the base rate
            while a flat cashback card would do better.
          </p>
        </section>

        <section>
          <h2 className="text-base md:text-[16px] font-semibold text-foreground mb-3">
            Stacking with affiliate savings
          </h2>
          <p>
            Card cashback and affiliate savings are paid by different parties and
            don&apos;t cancel each other out. If K33pr earns a 3% commission on an Amazon
            purchase and you pay with the Chase Amazon Prime Visa, you&apos;re collecting
            3% from K33pr and 5% from Chase on the same transaction — 8% total return on
            the purchase price.
          </p>
          <p className="mt-4">
            The combination changes which card is optimal depending on the retailer. A
            retailer paying 7% affiliate commission paired with a card earning 1% base
            rate may beat Amazon&apos;s 3% commission plus a 5% card rate. K33pr
            calculates this automatically when you add your cards in Settings.
          </p>
          <p className="mt-4">
            The honest answer is that most people are over-thinking the card selection.
            Pick one card that works well for Amazon, set it as your default for those
            purchases, and move on. The bigger gains usually come from stacking affiliate
            cashback on top — which changes the math on which retailer is actually
            cheapest.
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
