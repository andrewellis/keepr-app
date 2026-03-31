export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Terms of Service</h1>
      <p className="text-xs text-foreground-secondary mb-8">Last updated: March 30, 2026</p>

      <div className="space-y-6 text-sm text-foreground-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using K33pr (&ldquo;the Site&rdquo;), operated by GRMtek LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;),
            you agree to be bound by these Terms of Service. If you do not agree, do not use the Site.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h2>
          <p>
            K33pr allows users to photograph or upload images of products, identifies those products
            using computer vision, and presents affiliate purchase links from retail partners. When a
            purchase is made through an affiliate link, GRMtek earns a commission from the retailer.
            A portion of that commission is paid to the user.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. How Payouts Work</h2>
          <p className="mb-2">
            When you click an affiliate link through K33pr and complete a purchase, the retailer pays
            GRMtek a commission. From that commission:
          </p>
          <p className="mb-1">— GRMtek retains a $0.20 processing fee per transaction.</p>
          <p className="mb-1">— The remaining commission is paid to you (&ldquo;user payout&rdquo;).</p>
          <p className="mt-2 mb-2">
            <span className="text-foreground font-medium">Important conditions:</span>
          </p>
          <p className="mb-1">— Payouts are contingent on the retailer confirming the purchase. Clicking a link alone does not generate a payout.</p>
          <p className="mb-1">— If the commission earned is less than $0.20, no user payout is issued for that transaction.</p>
          <p className="mb-1">— Retailers may revoke commissions for returned items, canceled orders, or fraudulent activity.</p>
          <p className="mb-1">— Payout timing depends on retailer confirmation periods, which typically range from 30 to 90 days.</p>
          <p className="mb-1">— GRMtek reserves the right to withhold payouts if fraudulent activity is suspected.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Estimated Cashback</h2>
          <p>
            The &ldquo;estimated cashback&rdquo; displayed alongside affiliate results is an estimate based on a
            credit card cashback rate you configure in your settings (default: 5%). This is provided
            for informational purposes only. K33pr does not process, guarantee, or have any
            involvement with your credit card rewards. Actual cashback depends on your card issuer&apos;s
            terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Accounts</h2>
          <p className="mb-2">
            You may use K33pr without creating an account. To receive payouts, you must create an
            account with a valid email address. You are responsible for maintaining the security of
            your account credentials. GRMtek is not liable for unauthorized access to your account.
          </p>
          <p>
            You may delete your account at any time. Upon deletion, your profile information will be
            removed. Transaction records may be retained for legal and tax compliance purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Tax Obligations</h2>
          <p>
            Payouts from K33pr may constitute taxable income. If your total payouts reach $600 or
            more in a calendar year, GRMtek is required to issue a 1099-NEC form and may require you
            to submit a W-9 before further payouts can be processed. You are solely responsible for
            reporting and paying any taxes owed on your earnings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Prohibited Conduct</h2>
          <p className="mb-2">You agree not to:</p>
          <p className="mb-1">— Click affiliate links with no intent to purchase in order to inflate metrics</p>
          <p className="mb-1">— Use automated tools, bots, or scripts to interact with the Site</p>
          <p className="mb-1">— Create multiple accounts to circumvent any limitations</p>
          <p className="mb-1">— Attempt to manipulate or reverse-engineer the payout calculation system</p>
          <p className="mb-1">— Use the Site for any illegal purpose</p>
          <p className="mt-2">
            Violation of these terms may result in account suspension, forfeiture of pending payouts,
            and permanent ban from the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Affiliate Disclosure</h2>
          <p>
            K33pr earns commissions from qualifying purchases made through affiliate links displayed
            on the Site. As an Amazon Associate, GRMtek LLC earns from qualifying purchases. Affiliate
            relationships exist with other retailers as well. The ranking of results is based on
            estimated total return to the user, not on commission rates paid to GRMtek.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">9. Disclaimers</h2>
          <p className="mb-2">
            The Site is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
            GRMtek does not guarantee:
          </p>
          <p className="mb-1">— The accuracy of product identification</p>
          <p className="mb-1">— The availability or pricing of products shown</p>
          <p className="mb-1">— That any specific commission rate will apply to a purchase</p>
          <p className="mb-1">— Uninterrupted or error-free operation of the Site</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, GRMtek LLC shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the Site,
            including but not limited to lost profits, lost commissions, or data loss. GRMtek&apos;s total
            liability for any claim arising from these terms shall not exceed the total payouts made
            to your account in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">11. Modifications</h2>
          <p>
            GRMtek may modify these Terms of Service at any time. We will notify registered users of
            material changes via email. Continued use of the Site after changes constitutes acceptance
            of the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">12. Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of Florida, without regard to conflict
            of law provisions. Any disputes shall be resolved in the courts of the State of Florida.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">13. Contact</h2>
          <p>
            For questions about these Terms of Service, contact GRMtek LLC at:
            <br />
            <a href="mailto:legal@grmtek.com" className="text-primary hover:opacity-80">legal@grmtek.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
