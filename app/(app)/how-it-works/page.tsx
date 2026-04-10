import Link from 'next/link'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'How It Works | K33pr',
  description: 'How K33pr finds the best price across retailers and pays you cashback on every purchase.',
}

const steps = [
  {
    num: 1,
    title: 'Scan or search',
    desc: 'Point your camera at any product or type a name. Image recognition identifies it in seconds.',
  },
  {
    num: 2,
    title: 'Compare across retailers',
    desc: 'K33pr searches Amazon, Walmart, eBay, Best Buy, Home Depot, and Google Shopping simultaneously. Results ranked by net cost to you.',
  },
  {
    num: 3,
    title: 'Card savings calculated',
    desc: "Add your credit cards once. K33pr factors in your card\u2019s cashback rate per category so you see the true net cost at each retailer.",
  },
  {
    num: 4,
    title: 'Buy and earn',
    desc: 'Tap to go directly to the retailer. Complete your purchase normally. The retailer confirms, we calculate your earnings.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[720px] mx-auto md:pt-16">
      <p className="text-[11px] font-medium text-primary tracking-wider uppercase mb-2 md:text-center">How it works</p>
      <h1 className="text-2xl font-medium text-foreground mb-1.5 leading-tight md:text-[28px] md:text-center">Find the best price. Get paid.</h1>
      <p className="text-sm text-foreground-secondary mb-8 leading-relaxed md:text-center md:max-w-[460px] md:mx-auto">K33pr searches retailers, compares prices, and sends you the difference.</p>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden relative pl-9 space-y-7 mb-8">
        <div className="absolute left-[14px] top-[18px] bottom-[18px] w-[1.5px] bg-border" />
        {steps.map((s) => (
          <div key={s.num} className="relative">
            <div className="absolute -left-9 top-0 w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-medium">{s.num}</span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1 pt-1">{s.title}</p>
            <p className="text-[13px] text-foreground-secondary leading-relaxed">{s.desc}</p>
          </div>
        ))}
        <div className="relative">
          <div className="absolute -left-9 top-0 w-[30px] h-[30px] rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-medium">5</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1 pt-1">Get paid</p>
          <p className="text-[13px] text-foreground-secondary leading-relaxed">Balance hits $5 — we send your earnings via PayPal or Venmo. No minimum purchase count.</p>
        </div>
      </div>

      {/* Desktop: 2x2 grid + full-width step 5 */}
      <div className="hidden md:block mb-10">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {steps.map((s) => (
            <div key={s.num} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">{s.num}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
              </div>
              <p className="text-[13px] text-foreground-secondary leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">5</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-0.5">Get paid</p>
            <p className="text-[13px] text-foreground-secondary leading-relaxed">Balance hits $5 — we send your earnings via PayPal or Venmo. No minimum purchase count.</p>
          </div>
        </div>
      </div>

      {/* How we make money */}
      <div className="border-t border-border pt-8 md:text-center">
        <h2 className="text-base font-medium text-foreground mb-2 md:text-[15px]">How we make money</h2>
        <p className="text-[13px] text-foreground-secondary leading-relaxed mb-6 md:max-w-[500px] md:mx-auto">Retailers pay K33pr an affiliate commission when you buy through our links. We keep a flat fee and pass the rest to you.</p>
        <div className="flex gap-3 md:max-w-[340px] md:mx-auto">
          <div className="flex-1 bg-surface border border-border rounded-xl py-4 text-center">
            <p className="text-lg font-medium text-primary">$0.20</p>
            <p className="text-[11px] text-foreground-secondary mt-1">K33pr keeps</p>
          </div>
          <div className="flex-1 bg-surface border border-border rounded-xl py-4 text-center">
            <p className="text-lg font-medium text-foreground">The rest</p>
            <p className="text-[11px] text-foreground-secondary mt-1">Goes to you</p>
          </div>
        </div>
      </div>

      <div className="mt-8 md:text-center">
        <Link href="/faq" className="text-sm text-primary font-medium hover:underline transition">
          Have questions? Read the FAQ →
        </Link>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
