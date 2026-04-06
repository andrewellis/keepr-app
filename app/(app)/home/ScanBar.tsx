'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const PLACEHOLDERS = [
  'Find me AirPods Pro deals...',
  'Search for a Dyson V15...',
  'Compare LEGO set prices...',
  'Best price on a KitchenAid mixer...',
  'Track a Sony WH-1000XM5...',
]

export default function ScanBar() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'fixed', bottom: '72px', left: 0, right: 0, padding: '0 20px', zIndex: 40 }}>
      <div className="flex items-center gap-3 bg-white border border-border rounded-2xl px-4 py-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={PLACEHOLDERS[idx]}
          className="flex-1 bg-transparent text-sm text-foreground outline-none min-w-0"
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim() !== '') {
              router.push('/scan')
            }
          }}
        />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#534AB7' }}
          onClick={() => router.push('/scan')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4" fill="white"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
