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

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mx-5 mt-4 mb-6">
      <div
        className="flex items-center gap-3 bg-white border border-border rounded-2xl px-4 py-3 cursor-pointer"
        onClick={() => router.push('/scan')}
      >
        <span className="flex-1 text-sm text-foreground-secondary truncate">{PLACEHOLDERS[idx]}</span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#534AB7' }}
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
