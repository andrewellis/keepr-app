import FaqAccordion from '@/components/FaqAccordion'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export const metadata = {
  title: 'FAQ | K33pr',
  description: 'Frequently asked questions about how K33pr works, how you get paid, and what stores we compare.',
}

const faqItems = [
  {
    question: 'What is K33pr?',
    answer: 'K33pr is a product comparison site. Scan or search for any product, see prices across retailers, and earn cashback when you buy through K33pr links. Real money, sent via PayPal or Venmo.',
  },
  {
    question: 'How do rewards work?',
    answer: 'When you buy a product through a K33pr link, the retailer pays us an affiliate commission. We keep $0.20 to cover costs and send the rest to you. The commission rate varies by retailer and product category, typically between 1% and 8% of the purchase price.',
  },
  {
    question: 'What stores does K33pr search?',
    answer: 'K33pr searches across Amazon, Walmart, eBay, Best Buy, Home Depot, and Google Shopping results that include retailers like Target, Nike, Nordstrom, and others. The exact stores returned depend on the product category and availability.',
  },
  {
    question: 'How do I get paid?',
    answer: 'We send payouts via PayPal or Venmo. Add your PayPal email or Venmo phone number in Settings. Payouts are sent when your balance reaches $5.00.',
  },
  {
    question: 'Is K33pr free?',
    answer: 'Yes. Completely free to use. We make money from affiliate commissions, not from you.',
  },
  {
    question: 'How long until I get paid?',
    answer: 'Retailers typically confirm purchases within 1\u20134 weeks. Once confirmed, your earnings are added to your balance. When your balance hits $5.00, we send your payout.',
  },
  {
    question: "What\u2019s the card cashback rate?",
    answer: "That\u2019s your credit card\u2019s cashback percentage. K33pr uses it to calculate your total savings \u2014 the affiliate rewards we pay you plus what your credit card gives you. It helps you see the true cost of each purchase.",
  },
  {
    question: 'Do you sell my data?',
    answer: "No. We don\u2019t sell, share, or monetize your personal data. Our business model is affiliate commissions, not data brokering.",
  },
]

export default function FaqPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-[720px] mx-auto md:pt-16">
      <p className="text-[11px] font-medium text-primary tracking-wider uppercase mb-2 md:text-center">Support</p>
      <h1 className="text-2xl font-medium text-foreground mb-1.5 leading-tight md:text-[28px] md:text-center">Frequently asked questions</h1>
      <p className="text-sm text-foreground-secondary mb-8 leading-relaxed md:text-center">Everything you need to know about using K33pr.</p>

      {/* Mobile: accordion */}
      <div className="md:hidden">
        <FaqAccordion items={faqItems} />
      </div>

      {/* Desktop: 2-column grid with all answers visible */}
      <div className="hidden md:grid grid-cols-2 gap-3 mb-8">
        {faqItems.map((item, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4">
            <p className="text-[13px] font-medium text-foreground mb-1.5">{item.question}</p>
            <p className="text-xs text-foreground-secondary leading-relaxed">{item.answer}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 text-center mt-8">
        <p className="text-sm font-medium text-foreground mb-1">Still have questions?</p>
        <p className="text-[13px] text-foreground-secondary mb-3">We&apos;re here to help.</p>
        <a href="mailto:info@grmtek.com" className="text-[13px] text-primary font-medium hover:underline transition">
          Contact us →
        </a>
      </div>

      <AffiliateDisclosure />
    </div>
  )
}
