import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'K33pr Blog | Tips and Guides for Cashback',
  description:
    'Tips and guides for getting the most cashback on every purchase.',
}

const articles = [
  {
    title: 'How to Stack Cashback: Affiliate Commissions + Credit Card Rewards',
    date: 'March 1, 2026',
    description:
      'Learn how to combine affiliate cashback with credit card rewards on the same purchase for a higher total return.',
    href: '/blog/how-to-stack-cashback',
  },
  {
    title: 'Which Credit Cards Give the Most Cashback on Amazon Purchases?',
    date: 'March 10, 2026',
    description:
      'A breakdown of the top cards for Amazon shopping and how to pick the right one for your spending habits.',
    href: '/blog/best-cards-for-amazon',
  },
  {
    title: 'How to Get the Most Out of Online Shopping Cashback in 2026',
    date: 'March 20, 2026',
    description:
      'A practical guide to maximizing cashback across retailers, cards, and affiliate programs.',
    href: '/blog/online-shopping-cashback-guide',
  },
  {
    title: 'Cashback vs. Coupons: Which Saves You More?',
    date: 'March 28, 2026',
    description:
      'Coupons and cashback both reduce what you pay — but they work differently and one usually wins.',
    href: '/blog/cashback-vs-coupons',
  },
]

export default function BlogIndexPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">K33pr Blog</h1>
      <p className="text-sm text-foreground-secondary mb-10">
        Tips and guides for getting the most cashback on every purchase.
      </p>

      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="block bg-[#F8F8F6] border border-[#E5E5E3] rounded-2xl p-5 hover:border-[#534AB7] transition"
          >
            <p className="text-xs text-[#666666] mb-1">{article.date}</p>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-2 leading-snug">
              {article.title}
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              {article.description}
            </p>
            <p className="text-sm font-medium mt-3" style={{ color: '#534AB7' }}>
              Read more →
            </p>
          </Link>
        ))}
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
