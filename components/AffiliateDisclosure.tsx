import Link from 'next/link'

export default function AffiliateDisclosure() {
  return (
    <div className="mt-12 mb-6 px-1">
      <p className="text-xs text-center leading-relaxed text-foreground-secondary">
        K33pr may earn a small commission when you make a purchase through links on this site. This does not affect the price you pay. Commissions help support the operation of K33pr. See our{' '}
        <Link href="/terms" className="underline hover:text-primary transition">
          full disclosure
        </Link>
        .
      </p>
    </div>
  )
}
