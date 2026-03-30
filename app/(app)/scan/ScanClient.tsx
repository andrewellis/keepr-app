'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAnonSessionId } from '@/lib/anonSession'
import type { MatchResult } from '@/lib/affiliates/amazon'

type ScanState = 'idle' | 'preview' | 'processing' | 'result' | 'error'
type StoreState = 'idle' | 'loading' | 'done' | 'error'
type BuyState = 'idle' | 'opening'

interface VisionResult {
  labels: string[]
  webEntities: string[]
  bestGuess: string
}

async function trackAnonScan() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return
  const anonId = getAnonSessionId()
  await fetch('/api/anon-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonId }),
  }).catch(() => {})
}

function fmt(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

export default function ScanClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [storeState, setStoreState] = useState<StoreState>('idle')
  const [products, setProducts] = useState<MatchResult[]>([])
  const [buyStates, setBuyStates] = useState<Record<string, BuyState>>({})

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setCurrentFile(file)
    setScanState('preview')
  }

  function handleCameraCapture() {
    fileInputRef.current?.click()
  }

  function handleUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setCurrentFile(file)
      setScanState('preview')
    }
    input.click()
  }

  async function handleProcess() {
    if (!currentFile) return
    setScanState('processing')
    trackAnonScan()

    try {
      const formData = new FormData()
      formData.append('image', currentFile)
      const res = await fetch('/api/vision', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Vision API error')
      }

      const data: VisionResult = await res.json()
      setVisionResult(data)
      setStoreState('idle')
      setProducts([])
      setScanState('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setScanState('error')
    }
  }

  async function handleFindBestPrice() {
    if (!visionResult) return
    setStoreState('loading')
    setProducts([])
    try {
      const res = await fetch('/api/amazon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: visionResult.bestGuess, category: 'General' }),
      })
      if (!res.ok) throw new Error('store error')
      const data = await res.json()
      setProducts(data.products ?? [])
      setStoreState('done')
    } catch {
      setStoreState('error')
    }
  }

  function handleBuy(p: MatchResult) {
    window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer')
    setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'opening' }))
    setTimeout(() => {
      setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'idle' }))
    }, 1500)
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('keepr_anon_id') : null
    fetch('/api/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
      },
      body: JSON.stringify({
        productName: p.productName,
        retailer: p.retailer,
        priceCents: p.priceCents,
        commissionRate: p.affiliateRate,
        commissionCents: p.commissionCents,
        processingFeeCents: 20,
        userPayoutCents: p.userPayoutCents,
        estimatedCashbackCents: p.estimatedCashbackCents,
        totalReturnCents: p.totalReturnCents,
        affiliateUrl: p.affiliateUrl,
      }),
    }).catch(() => {})
  }

  function handleReset() {
    setPreviewUrl(null)
    setCurrentFile(null)
    setVisionResult(null)
    setErrorMsg(null)
    setScanState('idle')
    setStoreState('idle')
    setProducts([])
    setBuyStates({})
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-1">Scan Product</h1>
      <p className="text-sm text-foreground-secondary mb-6">
        Take a photo or upload an image of a clothing or product tag.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {scanState === 'idle' && (
        <div className="space-y-3">
          <button
            onClick={handleCameraCapture}
            className="w-full bg-primary rounded-2xl p-6 flex flex-col items-center gap-3 hover:opacity-90 active:scale-[0.98] transition"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-base">Take Photo</p>
              <p className="text-white/70 text-xs mt-0.5">Photograph the item</p>
            </div>
          </button>

          <button
            onClick={handleUpload}
            className="w-full bg-surface border border-border rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-primary active:scale-[0.98] transition"
          >
            <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center">
              <svg className="w-8 h-8 text-foreground-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-base">Upload Image</p>
              <p className="text-foreground-secondary text-xs mt-0.5">Choose from photo library</p>
            </div>
          </button>

          <div className="bg-surface border border-border rounded-2xl p-4 mt-2">
            <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Tips for best results</p>
            <ul className="space-y-1.5">
              {[
                'Lay the item flat on a neutral surface',
                'Ensure the tag or label is clearly visible',
                'Avoid shadows and glare',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-foreground-secondary">
                  <span className="text-primary mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {scanState === 'preview' && previewUrl && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Product preview" className="w-full object-contain max-h-96" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
            >
              Retake
            </button>
            <button
              onClick={handleProcess}
              className="flex-1 bg-primary rounded-xl py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Identify Product
            </button>
          </div>
        </div>
      )}

      {scanState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-24 h-24 rounded-2xl bg-surface border border-border animate-pulse" />
          <p className="text-sm" style={{ color: '#9ca3af' }}>Identifying product...</p>
        </div>
      )}

      {scanState === 'error' && (
        <div className="space-y-4">
          <div className="bg-surface border border-red-800/50 rounded-2xl p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground font-semibold text-sm">Identification failed</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>{errorMsg}</p>
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
          >
            Try Again
          </button>
        </div>
      )}

      {scanState === 'result' && visionResult && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Identified as</p>
              <p className="text-xl font-bold text-white capitalize">{visionResult.bestGuess}</p>
            </div>

            {visionResult.labels.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9ca3af' }}>Tags</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  {visionResult.labels.join(', ')}
                </p>
              </div>
            )}

            {visionResult.webEntities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9ca3af' }}>Related</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  {visionResult.webEntities.join(', ')}
                </p>
              </div>
            )}
          </div>

          {storeState === 'idle' && (
            <button
              onClick={handleFindBestPrice}
              className="w-full bg-primary rounded-xl py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Find Best Price
            </button>
          )}

          {storeState === 'loading' && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-border flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-border rounded w-3/4" />
                      <div className="h-3 bg-border rounded w-1/2" />
                      <div className="h-3 bg-border rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {storeState === 'done' && products.length === 0 && (
            <p className="text-sm text-center" style={{ color: '#9ca3af' }}>No matching products found.</p>
          )}

          {storeState === 'done' && products.length > 0 && (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={p.affiliateUrl} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex gap-3">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.productName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground leading-snug flex-1">{p.productName}</p>
                        {i === 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF6B35', color: '#fff' }}>
                            Best Deal
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-white">{fmt(p.priceCents)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Commission: {fmt(p.commissionCents)}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Fee: -$0.20</p>
                      <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>You earn: {fmt(p.userPayoutCents)}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Cashback: {fmt(p.estimatedCashbackCents)}</p>
                      <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>Total back: {fmt(p.totalReturnCents)}</p>
                    </div>
                    <button
                      onClick={() => handleBuy(p)}
                      className="bg-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                    >
                      {buyStates[p.affiliateUrl] === 'opening' ? 'Opening...' : 'Buy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {storeState === 'error' && (
            <p className="text-sm text-center" style={{ color: '#f87171' }}>Could not load store results.</p>
          )}

          <button
            onClick={handleReset}
            className="w-full bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
          >
            Scan Again
          </button>
        </div>
      )}
    </div>
  )
}
