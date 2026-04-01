import AffiliateDisclosure from '@/components/AffiliateDisclosure'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">About K33pr</h1>

      <div className="space-y-8">
        <p className="text-sm text-foreground-secondary leading-relaxed">
          K33pr is a product comparison website operated by GRMtek LLC, a Florida limited
          liability company. The site helps shoppers find the best total return on purchases
          by combining affiliate cashback with credit card rewards.
        </p>

        {/* How it works */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">How it works</h2>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            K33pr uses image recognition to identify products from photos. Once a product
            is identified, the site searches across multiple retailers and calculates the
            total cashback available through each — combining the affiliate commission K33pr
            earns with the cashback rate on the user&apos;s saved credit cards. The retailer
            with the highest combined return is ranked first.
          </p>
        </section>

        {/* Business model */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Business model</h2>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            K33pr earns affiliate commissions when users purchase through links on the site.
            GRMtek LLC retains $0.20 per transaction and returns the remainder of the
            commission to the user via PayPal or Venmo. There is no charge to use the site.
          </p>
        </section>

        {/* Company */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Company</h2>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            GRMtek LLC is incorporated in Florida. K33pr is operated as a website available
            at k33pr.com. The site is intended for use by adults aged 18 and older and is
            not directed toward children.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">Contact</h2>
          <p className="text-sm text-foreground-secondary leading-relaxed">
            For questions about the site, affiliate relationships, or business inquiries,
            contact us at:{' '}
            <a
              href="mailto:info@grmtek.com"
              className="text-primary hover:opacity-80 transition"
            >
              info@grmtek.com
            </a>
          </p>
        </section>
      </div>

      {/* Affiliate disclosure */}
      <AffiliateDisclosure />
    </div>
  )
}
