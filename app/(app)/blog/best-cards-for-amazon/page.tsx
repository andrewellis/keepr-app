import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'Which Credit Cards Give the Most Cashback on Amazon Purchases? | K33pr',
  description:
    'A breakdown of the top cards for Amazon shopping and how to pick the right one for your spending habits.',
}

export default function BestCardsForAmazonPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/blog" className="text-sm hover:underline transition" style={{ color: '#534AB7' }}>
          ← Back to Blog
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Which Credit Cards Give the Most Cashback on Amazon Purchases?
      </h1>
      <p className="text-sm text-foreground-secondary mb-10">March 10, 2026</p>

      <div className="space-y-8 text-sm text-foreground-secondary leading-relaxed">
        <p>
          Most people just use whatever card is in their wallet when they check out on
          Amazon. It works, but depending on the card, you might be earning 1% on
          purchases where you could be earning 5%. That gap adds up fast if you shop on
          Amazon regularly.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
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
          <h2 className="text-lg font-semibold text-foreground mb-3">How to decide</h2>
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
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Stacking with affiliate cashback
          </h2>
          <p>
            Card cashback and affiliate cashback are paid by different parties and
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
