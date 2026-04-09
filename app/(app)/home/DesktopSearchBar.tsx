'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DesktopSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit() {
    if (query.trim() === '') return
    router.push(`/scan?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="hidden md:block mt-8 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-2 bg-white border border-border rounded-2xl px-4 py-3 shadow-sm">
        <svg className="w-5 h-5 text-foreground-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Search for a product — e.g. AirPods Pro, Dyson V15, KitchenAid mixer"
          className="flex-1 bg-transparent text-sm text-foreground outline-none min-w-0"
        />
        <button
          onClick={handleSubmit}
          className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition flex-shrink-0"
        >
          Search
        </button>
      </div>
      <p className="text-xs text-foreground-secondary text-center mt-2">
        Or scan a product with your phone camera at k33pr.com
      </p>
    </div>
  )
}
