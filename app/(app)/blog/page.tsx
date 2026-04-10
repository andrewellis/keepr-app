import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'Blog | K33pr',
  description: 'Practical guides and tips for getting more back on purchases you\u2019re already making.',
}

const articles = [
  {
    title: 'How to stack cashback: affiliate commissions + credit card rewards',
    date: 'Mar 1, 2026',
    readTime: '4 min read',
    description: 'Affiliate cashback and credit card rewards are paid by different parties \u2014 you can collect both on the same purchase.',
    href: '/blog/how-to-stack-cashback',
    featured: true,
  },
  {
    title: 'Which credit cards give the most cashback on Amazon?',
    date: 'Mar 10, 2026',
    readTime: '4 min read',
    description: 'Top cards for Amazon shopping and how to pick the right one for your spending.',
    href: '/blog/best-cards-for-amazon',
  },
  {
    title: 'Online shopping cashback guide for 2026',
    date: 'Mar 20, 2026',
    readTime: '5 min read',
    description: 'Maximize cashback across retailers, cards, and affiliate programs.',
    href: '/blog/online-shopping-cashback-guide',
  },
  {
    title: 'Cashback vs. coupons: which saves you more?',
    date: 'Mar 28, 2026',
    readTime: '4 min read',
    description: 'They work differently and one usually wins over time.',
    href: '/blog/cashback-vs-coupons',
  },
]

export default function BlogIndexPage() {
  const featured = articles.find((a) => a.featured)
  const rest = articles.filter((a) => !a.featured)

  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[720px] mx-auto md:pt-16">
      <p className="text-[11px] font-medium text-primary tracking-wider uppercase mb-2 md:text-center">Blog</p>
      <h1 className="text-2xl font-medium text-foreground mb-1.5 leading-tight md:text-[28px] md:text-center">Guides and tips</h1>
      <p className="text-sm text-foreground-secondary mb-8 leading-relaxed md:text-center">Practical advice for getting more back on purchases you&apos;re already making.</p>

      <div className="space-y-4 md:space-y-3">
        {featured && (
          <Link href={featured.href} className="block bg-surface border border-border rounded-xl p-4 md:p-6 relative overflow-hidden hover:border-primary transition">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-primary rounded-l" />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-primary font-medium hidden md:inline">Featured</span>
              <span className="text-[11px] text-foreground-secondary hidden md:inline">&middot;</span>
              <span className="text-[11px] text-foreground-secondary">{featured.date}</span>
              <span className="text-[11px] text-foreground-secondary">&middot;</span>
              <span className="text-[11px] text-foreground-secondary">{featured.readTime}</span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-foreground mb-1.5 leading-snug">{featured.title}</h2>
            <p className="text-xs md:text-[13px] text-foreground-secondary leading-relaxed mb-2.5">{featured.description}</p>
            <p className="text-xs md:text-[13px] text-primary font-medium">Read →</p>
          </Link>
        )}

        <div className="md:hidden space-y-4">
          {rest.map((article) => (
            <Link key={article.href} href={article.href} className="block bg-surface border border-border rounded-xl p-4 hover:border-primary transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-foreground-secondary">{article.date}</span>
                <span className="text-[11px] text-foreground-secondary">&middot;</span>
                <span className="text-[11px] text-foreground-secondary">{article.readTime}</span>
              </div>
              <h2 className="text-sm font-medium text-foreground mb-1.5 leading-snug">{article.title}</h2>
              <p className="text-xs text-foreground-secondary leading-relaxed mb-2.5">{article.description}</p>
              <p className="text-xs text-primary font-medium">Read →</p>
            </Link>
          ))}
        </div>

        <div className="hidden md:grid grid-cols-3 gap-3">
          {rest.map((article) => (
            <Link key={article.href} href={article.href} className="block bg-surface border border-border rounded-xl p-4 hover:border-primary transition">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[11px] text-foreground-secondary">{article.date}</span>
                <span className="text-[11px] text-foreground-secondary">&middot;</span>
                <span className="text-[11px] text-foreground-secondary">{article.readTime.replace(' read', '')}</span>
              </div>
              <h2 className="text-sm font-medium text-foreground mb-1.5 leading-snug">{article.title}</h2>
              <p className="text-xs text-foreground-secondary leading-relaxed mb-3">{article.description}</p>
              <p className="text-xs text-primary font-medium">Read →</p>
            </Link>
          ))}
        </div>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
