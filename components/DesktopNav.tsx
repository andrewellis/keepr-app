'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DesktopNav() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  return (
    <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border bg-background sticky top-0 z-50">
      <Link href="/home" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#534AB7' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <span className="font-semibold text-lg text-foreground">K33pr</span>
      </Link>
      <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg w-[340px]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Search for a product..." className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { router.push('/scan?q=' + encodeURIComponent(query.trim())); setQuery('') } }} />
      </div>
      <div className="flex items-center gap-5">
        <Link href="/how-it-works" className="text-[15px] text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
        <Link href="/faq" className="text-[15px] text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
        <Link href="/blog" className="text-[15px] text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
        <Link href="/login" className="text-[15px] font-medium" style={{ color: '#534AB7' }}>Sign in</Link>
      </div>
    </header>
  )
}
