'use client'

import { useRef, useState, useEffect } from 'react'
import type { AffiliateResult } from '@/lib/affiliates/types'
import ResultSkeleton from '@/components/ResultSkeleton'

type ScanState = 'idle' | 'preview' | 'processing' | 'result' | 'error'
type StoreState = 'idle' | 'loading' | 'done' | 'error'
type BuyState = 'idle' | 'opening'

interface ScanResult {
  productName: string | null
  category: string | null
  confidence: number
  searchTerms: string[]
  error: string | null
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // Scale down if width > 1200px
      if (width > 1200) {
        height = Math.round((height * 1200) / width)
        width = 1200
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)

      // Try quality 0.75 first
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          if (blob.size <= 800_000) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            return
          }
          // Retry at quality 0.6
          canvas.toBlob(
            (blob2) => {
              if (!blob2) { resolve(file); return }
              resolve(new File([blob2], file.name, { type: 'image/jpeg' }))
            },
            'image/jpeg',
            0.6
          )
        },
        'image/jpeg',
        0.75
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/** Determine the button label based on retailer */
function buyButtonLabel(p: AffiliateResult, buyState: BuyState): string {
  if (buyState === 'opening') return 'Opening...'
  if (p.retailer === 'Amazon') return 'Search on Amazon'
  return `Search on ${p.retailer.replace(/ \(.*\)$/, '')}`
}

export default function ScanClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [storeState, setStoreState] = useState<StoreState>('idle')
  const [products, setProducts] = useState<AffiliateResult[]>([])
  const [buyStates, setBuyStates] = useState<Record<string, BuyState>>({})
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    function handleOnline() { setIsOffline(false) }
    function handleOffline() { setIsOffline(true) }

    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
    console.log('scan submitted')
    if (!currentFile) return
    setScanState('processing')

    // Check network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('No internet connection. Please check your network and try again.')
      setScanState('error')
      return
    }

    try {
      const compressed = await compressImage(currentFile)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Image compressed: ${currentFile.size} → ${compressed.size} bytes`)
      }

      const formData = new FormData()
      formData.append('image', compressed)
      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Vision API error')
      }

      const data: ScanResult = await res.json()
      if (data.error) {
        if (data.error === 'recognition_timeout') {
          throw new Error('Scan took too long. Try again.')
        }
        throw new Error(data.error)
      }
      if (!data.productName) {
        throw new Error("Couldn't identify that product. Try a different angle or better lighting.")
      }
      setScanResult(data)
      setStoreState('idle')
      setProducts([])
      setScanState('result')
    } catch (err) {
      console.log('scan error:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setScanState('error')
    }
  }

  async function handleFindBestPrice() {
    if (!scanResult) return
    setStoreState('loading')
    setProducts([])

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStoreState('error')
      return
    }

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: scanResult.productName,
          category: scanResult.category,
          searchTerms: scanResult.searchTerms,
        }),
      })
      if (!res.ok) throw new Error('store error')
      const data = await res.json()
      setProducts(data.results ?? [])
      setStoreState('done')
    } catch {
      setStoreState('error')
    }
  }

  function handleBuy(p: AffiliateResult) {
    window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer')
    setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'opening' }))
    setTimeout(() => {
      setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'idle' }))
    }, 1500)
    // Only log transaction if price is known (not a search link)
    if (p.price > 0) {
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
          priceCents: p.price,
          commissionRate: p.affiliateRate,
          commissionCents: p.commissionCents,
          processingFeeCents: 20,
          userPayoutCents: p.userPayoutCents,
          estimatedCashbackCents: p.estimatedCashbackCents,
          totalReturnCents: p.totalReturnCents,
          affiliateUrl: p.affiliateUrl,
          productUrl: p.productUrl,
        }),
      }).catch(() => {})
    }
  }

  function handleReset() {
    setPreviewUrl(null)
    setCurrentFile(null)
    setScanResult(null)
    setErrorMsg(null)
    setScanState('idle')
    setStoreState('idle')
    setProducts([])
    setBuyStates({})
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      {isOffline && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-600 text-center">No internet connection.</p>
        </div>
      )}

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
          <p className="text-sm text-foreground-secondary">Identifying product...</p>
        </div>
      )}

      {scanState === 'error' && (
        <div className="space-y-4">
          <div className="bg-surface border border-red-200 rounded-2xl p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground font-semibold text-sm">Identification failed</p>
            <p className="text-xs text-foreground-secondary">{errorMsg}</p>
          </div>
          <button
            onClick={handleReset}
            className="w-full bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:border-primary transition"
          >
            Try Again
          </button>
        </div>
      )}

      {scanState === 'result' && scanResult && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-foreground-secondary">Identified as</p>
              <p className="text-xl font-bold text-foreground capitalize">{scanResult.productName}</p>
            </div>

            {scanResult.category && scanResult.category !== 'General' && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-foreground-secondary">Category</p>
                <p className="text-sm text-foreground">{scanResult.category}</p>
              </div>
            )}

            {scanResult.confidence > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-foreground-secondary">Confidence</p>
                <p className="text-sm text-foreground">{Math.round(scanResult.confidence * 100)}%</p>
              </div>
            )}

            {scanResult.searchTerms.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground-secondary">Search Terms</p>
                <p className="text-xs text-foreground-secondary">
                  {scanResult.searchTerms.join(', ')}
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

          {storeState === 'loading' && <ResultSkeleton />}

          {storeState === 'done' && products.length === 0 && (
            <p className="text-sm text-center text-foreground-secondary">
              No matching products found{scanResult?.productName ? ` for ${scanResult.productName}` : ''}.
            </p>
          )}

          {storeState === 'done' && products.length > 0 && (
            <div className="space-y-3">
              {/* Product summary card */}
              {scanResult && (
                <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-4">
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={scanResult.productName || 'Product'}
                      className="w-[120px] h-[120px] rounded-xl object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="text-base font-bold text-foreground">{scanResult.productName}</p>
                    {scanResult.category && (
                      <p className="text-sm text-foreground-secondary mt-1">{scanResult.category}</p>
                    )}
                    <p className="text-xs text-foreground-secondary mt-2">Identified by K33pr</p>
                  </div>
                </div>
              )}

              {products.map((p) => {
                const priceKnown = p.price > 0
                const buyState = buyStates[p.affiliateUrl] ?? 'idle'
                const affiliateRatePct = Math.round(p.affiliateRate * 100)
                return (
                  <div key={p.affiliateUrl} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                    {/* Retailer + product name */}
                    <div>
                      <p className="text-base font-bold text-foreground">{p.retailer}</p>
                      <p className="text-sm text-foreground-secondary leading-snug mt-0.5">{p.productName}</p>
                    </div>

                    {/* Commission rate display */}
                    <p className="text-xs text-foreground-secondary">
                      Earn up to {affiliateRatePct}% cashback through K33pr
                    </p>

                    {/* Image if available */}
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.productName} className="w-16 h-16 rounded-xl object-cover" />
                    )}

                    {/* Price + earnings — only when price is known */}
                    {priceKnown && (
                      <div className="space-y-0.5">
                        <p className="text-base font-bold text-foreground">${(p.price / 100).toFixed(2)}</p>
                        <p className="text-xs text-foreground-secondary">Commission: ${(p.commissionCents / 100).toFixed(2)}</p>
                        <p className="text-xs text-foreground-secondary">Fee: -$0.20</p>
                        <p className="text-xs font-semibold text-primary">You earn: ${(p.userPayoutCents / 100).toFixed(2)}</p>
                        <p className="text-xs text-foreground-secondary">Cashback: ${(p.estimatedCashbackCents / 100).toFixed(2)}</p>
                        <p className="text-xs font-semibold text-primary">Total back: ${(p.totalReturnCents / 100).toFixed(2)}</p>
                      </div>
                    )}

                    {/* Search / Buy button */}
                    <button
                      onClick={() => handleBuy(p)}
                      className="w-full bg-primary rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
                    >
                      {buyButtonLabel(p, buyState)}
                    </button>

                    {/* Helper text for search links */}
                    {!priceKnown && (
                      <p className="text-xs text-center text-foreground-secondary">
                        Find this product on {p.retailer.replace(/ \(.*\)$/, '')}. Your purchase earns cashback through K33pr.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {storeState === 'error' && (
            <div className="bg-surface border border-red-200 rounded-2xl p-5 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {scanResult?.productName
                  ? `Found ${scanResult.productName} but couldn't load store results right now.`
                  : 'Couldn\'t load store results.'}
              </p>
              <button
                onClick={handleFindBestPrice}
                className="text-sm text-primary font-medium hover:opacity-80 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {storeState === 'done' && products.length > 0 && (
            <p className="text-xs text-center text-foreground-secondary">
              As an Amazon Associate, GRMtek LLC earns from qualifying purchases.
            </p>
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
