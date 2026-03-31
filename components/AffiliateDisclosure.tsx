import Link from 'next/link'

export default function AffiliateDisclosure() {
  return (
    <div className="mt-12 mb-6 px-1">
      <p className="text-xs text-center leading-relaxed" style={{ color: '#6b7280' }}>
        K33pr earns affiliate commissions when you purchase through our links.
        This is how we fund your cashback. See our{' '}
        <Link href="/terms" className="underline hover:text-primary transition">
          full disclosure
        </Link>
        .
      </p>
      <p className="text-xs text-center mt-1" style={{ color: '#6b7280' }}>
        As an Amazon Associate, GRMtek LLC earns from qualifying purchases.
      </p>
    </div>
  )
}
