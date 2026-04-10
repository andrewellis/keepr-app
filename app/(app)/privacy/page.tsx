export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background px-5 pt-12 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <p className="text-xs text-foreground-secondary mb-8">Last updated: April 10, 2026</p>

      <div className="space-y-6 text-sm text-foreground-secondary leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Who We Are</h2>
          <p>
            K33pr is operated by GRMtek LLC, a Florida limited liability company. This Privacy Policy
            describes how we collect, use, and protect your information when you use the K33pr
            website at k33pr.com.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Information We Collect</h2>
          <p className="mb-2"><span className="text-foreground font-medium">Account information:</span> When you create an account, we collect your email address and display name.</p>
          <p className="mb-2"><span className="text-foreground font-medium">Product scan data:</span> When you scan a product, we process the image temporarily to identify the product. Images are processed in memory and are not stored on our servers.</p>
          <p className="mb-2"><span className="text-foreground font-medium">Transaction data:</span> We record which affiliate links you click, including product name, retailer, price, and estimated payout. This is necessary to attribute commissions and process your payouts.</p>
          <p className="mb-2"><span className="text-foreground font-medium">Anonymous session data:</span> If you use K33pr without creating an account, we assign a random session identifier stored in your browser&apos;s local storage. This is used solely to track your transactions for potential payout if you later create an account.</p>
          <p><span className="text-foreground font-medium">Device information:</span> We do not collect device identifiers, IP addresses for tracking, or location data. Standard server logs may temporarily contain IP addresses as part of normal web hosting.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
          <p className="mb-2">We use your information to:</p>
          <p className="mb-1">— Identify products you scan and find matching affiliate listings</p>
          <p className="mb-1">— Track affiliate link clicks and attribute commissions to your account</p>
          <p className="mb-1">— Process payouts for confirmed purchases</p>
          <p className="mb-1">— Maintain and improve the K33pr website</p>
          <p className="mt-2">We do not sell your personal information to third parties. We do not use your data for advertising or profiling.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Third-Party Services</h2>
          <p className="mb-2">K33pr uses the following third-party services to operate:</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Google Cloud Vision API:</span> Processes product images for identification. Google&apos;s privacy policy applies to image processing.</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Affiliate Networks:</span> K33pr participates in affiliate programs with various retailers. When you click an affiliate link, the retailer&apos;s privacy policy governs your interaction with them.</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Supabase:</span> Hosts our database and authentication. Data is stored in the United States.</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Vercel:</span> Hosts our website. Standard web hosting logs apply.</p>
          <p className="mt-2">When you click an affiliate link and visit a retailer&apos;s website, that retailer&apos;s privacy policy governs your interaction with them.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Cookies and Tracking Technologies</h2>
          <p className="mb-2">K33pr uses a limited set of cookies and browser-based tracking for the following purposes:</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Authentication cookies:</span> Managed by Supabase to keep you signed in across sessions.</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Affiliate tracking parameters:</span> When you click an affiliate link, a unique click identifier is appended to the URL. This allows affiliate networks (such as Amazon Associates, CJ Affiliate, Rakuten, Impact, and Awin) to attribute purchases to K33pr. These identifiers are stored in the affiliate network&apos;s cookies, not by K33pr directly.</p>
          <p className="mb-1">— <span className="text-foreground font-medium">Local storage:</span> We use browser local storage to maintain anonymous session identifiers for users who have not created an account.</p>
          <p className="mt-2">K33pr does not use advertising cookies, analytics cookies, or third-party tracking pixels. We do not participate in cross-site tracking or retargeting.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. GDPR and CCPA Compliance</h2>
          <p className="mb-2"><span className="text-foreground font-medium">For users in the European Economic Area (GDPR):</span> Our legal basis for processing your data is contract performance (to provide the K33pr service) and legitimate interest (to operate affiliate tracking necessary for our business model). You have the right to access, rectify, erase, restrict processing, and port your data. You may also withdraw consent at any time where consent is the basis for processing. To exercise these rights, contact us at privacy@grmtek.com.</p>
          <p className="mb-2"><span className="text-foreground font-medium">For California residents (CCPA):</span> You have the right to know what personal information we collect, request deletion of your data, and opt out of the sale of personal information. K33pr does not sell personal information. To submit a request, contact us at privacy@grmtek.com. We will verify your identity before processing any request and respond within 45 days.</p>
          <p><span className="text-foreground font-medium">For all users:</span> You may contact us at any time at <a href="mailto:privacy@grmtek.com" className="text-primary hover:opacity-80">privacy@grmtek.com</a> to request access to, correction of, or deletion of your personal data.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Data Retention</h2>
          <p>
            Account and transaction data is retained as long as your account is active. If you delete
            your account, your profile data will be removed. Transaction records may be retained for
            tax and legal compliance purposes for up to 7 years. Product images are never stored —
            they are processed in memory and discarded immediately.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <p className="mb-1">— Access the personal data we hold about you</p>
          <p className="mb-1">— Request correction of inaccurate data</p>
          <p className="mb-1">— Request deletion of your account and associated data</p>
          <p className="mb-1">— Opt out of any future marketing communications</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">9. Security</h2>
          <p>
            We use industry-standard security measures including HTTPS encryption, row-level database
            security, and secure authentication. API keys and secrets are stored in environment
            variables and never exposed in client-side code. However, no method of transmission over
            the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">10. Children&apos;s Privacy</h2>
          <p>
            K33pr is not intended for use by children under the age of 13. We do not knowingly
            collect personal information from children under 13. If we discover that we have collected
            information from a child under 13, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify registered users of
            material changes via the email address associated with their account. The &ldquo;last updated&rdquo;
            date at the top of this page reflects the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">12. Contact Us</h2>
          <p>
            For privacy-related questions or requests, contact GRMtek LLC at:
            <br />
            <a href="mailto:privacy@grmtek.com" className="text-primary hover:opacity-80">privacy@grmtek.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
