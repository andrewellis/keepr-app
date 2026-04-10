import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="py-6 px-5 border-t border-border mt-8">
      <p className="text-[11px] text-foreground-secondary text-center leading-relaxed max-w-xl mx-auto">
        K33pr is a product of GRMtek LLC. As an Amazon Associate, GRMtek LLC earns from qualifying purchases. K33pr earns commissions from affiliate links on this site.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap mt-3">
        <Link href="/how-it-works" className="text-xs text-foreground-secondary hover:text-primary transition">How It Works</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/faq" className="text-xs text-foreground-secondary hover:text-primary transition">FAQ</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/privacy" className="text-xs text-foreground-secondary hover:text-primary transition">Privacy Policy</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/terms" className="text-xs text-foreground-secondary hover:text-primary transition">Terms of Service</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/payment-terms" className="text-xs text-foreground-secondary hover:text-primary transition">Payment Terms</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/about" className="text-xs text-foreground-secondary hover:text-primary transition">About</Link>
        <span className="text-xs text-foreground-secondary">·</span>
        <Link href="/blog" className="text-xs text-foreground-secondary hover:text-primary transition">Blog</Link>
      </div>
      <p className="text-[11px] text-foreground-secondary text-center mt-3">© 2026 GRMtek LLC</p>
    </footer>
  )
}
