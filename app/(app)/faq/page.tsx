import FaqAccordion from '@/components/FaqAccordion'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'

const faqItems = [
  {
    question: 'What is K33pr?',
    answer:
      'K33pr is a product scanner website that helps you find the best price across multiple retailers and earn cashback on your purchases. Scan any product with your camera, compare prices, and buy through K33pr to earn real money back.',
  },
  {
    question: 'How does cashback work?',
    answer:
      'When you buy a product through a K33pr link, the retailer pays us an affiliate commission. We keep $0.20 to cover costs and send the rest to you. The commission rate varies by retailer and product category, typically between 1% and 8% of the purchase price.',
  },
  {
    question: 'How do I get paid?',
    answer:
      'We send payouts via PayPal or Venmo. Add your PayPal email or Venmo phone number in Settings. Payouts are sent when your balance reaches $5.00.',
  },
  {
    question: 'Is K33pr free?',
    answer:
      'Yes. K33pr is completely free to use. We make money from affiliate commissions, not from you.',
  },
  {
    question: 'What stores does K33pr compare?',
    answer:
      "We currently search across Amazon, with Target, Macy's, Nordstrom, Nike, Adidas, and ASOS coming soon. We're adding new retailers regularly.",
  },
  {
    question: 'How does the scanning work?',
    answer:
      "K33pr uses Google's image recognition to identify products from your camera. Point your camera at a product, and we'll identify the brand, model, and category, then search retailers for matches.",
  },
  {
    question: "What's the minimum payout?",
    answer:
      '$5.00. This minimum helps us keep transaction fees low so more of the commission goes to you.',
  },
  {
    question: 'How long until I get paid after a purchase?',
    answer:
      'Retailers typically confirm purchases within 1–4 weeks. Once confirmed, your cashback is added to your balance. When your balance hits $5.00, we send your payout.',
  },
  {
    question: "What's the credit card cashback rate in Settings?",
    answer:
      "That's your credit card's cashback percentage. K33pr uses it to calculate your total savings — the affiliate cashback we pay you plus what your credit card gives you. It helps you see the true cost of each purchase.",
  },
  {
    question: 'Do you sell my data?',
    answer:
      "No. We don't sell, share, or monetize your personal data. Our business model is affiliate commissions, not data brokering.",
  },
]

export default function FaqPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">
        Frequently Asked Questions
      </h1>

      <FaqAccordion items={faqItems} />

      {/* Affiliate disclosure */}
      <AffiliateDisclosure />
    </div>
  )
}
