'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import type { AffiliateResult } from '@/lib/affiliates/types'
import type { ShoppingResult } from '@/lib/shopping/types'
import type { SerpResult } from '@/lib/search/serp-multi-search'
import { getUserCardsWithRates } from '@/lib/cards/actions'
import { getCardCategory } from '@/lib/cards/categoryMap'
import { getBestCardRecommendation } from '@/lib/cards/recommender'
import type { CardRecommendation } from '@/lib/cards/recommender'
import { createClient } from '@/lib/supabase/client'
import { RetailerEngagementBanner } from '@/components/RetailerEngagementBanner'

type ScanState = 'idle' | 'preview' | 'processing' | 'result' | 'error'
type StoreState = 'idle' | 'loading' | 'done' | 'error'

interface ScanResult {
  productName: string | null
  category: string | null
  confidence: number
  searchTerms: string[]
  visionLabels?: string[]
  error: string | null
}

interface MatchResults {
  results: (AffiliateResult & { clickId?: string })[]
  shoppingResults: ShoppingResult[]
  serpResults?: SerpResult[]
  retailerContext?: {
    detectedRetailer: string;
    messageVariant: 'amazon_screenshot' | 'competitor_screenshot' | 'generic';
  };
  engagementMessage?: {
    headline: string;
    subtext: string;
    priceComparisonIntro: string;
  };
  searchMetadata?: {
    detectedRetailer: string;
    enginesUsed: number;
    resultsFound: number;
  };
}

interface SearchHistoryEntry {
  id: string
  product_name: string
  product_category: string | null
  results: MatchResults
  created_at: string
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

const PRICE_RANGES: Record<string, string> = {
  'Electronics': '$29 – $299',
  'Beauty': '$8 – $45',
  'Groceries': '$3 – $25',
  'Clothing & Apparel': '$15 – $120',
  'Home & Garden': '$12 – $89',
  'Sports & Outdoors': '$18 – $150',
  'Toys & Games': '$10 – $80',
  'Books': '$8 – $35',
  'Automotive': '$15 – $120',
  'Office Products': '$8 – $65',
  'Pet Supplies': '$8 – $55',
  'Health': '$8 – $45',
  'Tools & Hardware': '$15 – $150',
  'Other': '$10 – $100',
}

function getPriceRange(category: string | null): string {
  if (!category) return PRICE_RANGES['Other']
  return PRICE_RANGES[category] ?? PRICE_RANGES['Other']
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ScanClient() {
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [storeState, setStoreState] = useState<StoreState>('idle')
  const [products, setProducts] = useState<(AffiliateResult & { clickId?: string })[]>([])
  const [shoppingResults, setShoppingResults] = useState<ShoppingResult[]>([])
  const [serpResults, setSerpResults] = useState<SerpResult[]>([])
  const [matchResult, setMatchResult] = useState<MatchResults | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  // Card recommendation state
  // null = not yet resolved, undefined = no recommendation (no cards / not logged in)
  const [cardRecommendation, setCardRecommendation] = useState<CardRecommendation | null | undefined>(null)
  const [userLoggedIn, setUserLoggedIn] = useState<boolean | null>(null)

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Load search history on mount (only for logged-in users)
  const loadSearchHistory = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setHistoryLoaded(true); return }

      const { data } = await supabase
        .from('search_history')
        .select('id, product_name, product_category, results, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setSearchHistory(data as SearchHistoryEntry[])
      }
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setHistoryLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadSearchHistory()
  }, [loadSearchHistory])

  // Save to search history after successful match results
  const saveToHistory = useCallback(async (
    scan: ScanResult,
    matchResults: MatchResults
  ) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !scan.productName) return

      await supabase.from('search_history').insert({
        user_id: user.id,
        product_name: scan.productName,
        product_category: scan.category ?? null,
        image_url: null,
        results: matchResults as unknown as Record<string, unknown>,
      })

      // Refresh history list
      loadSearchHistory()
    } catch {
      // Non-fatal
    }
  }, [loadSearchHistory])

  // Fetch card recommendation after store results are loaded
  useEffect(() => {
    if (storeState !== 'done' || products.length === 0) return

    async function fetchCardRecommendation() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setUserLoggedIn(false)
          setCardRecommendation(undefined)
          return
        }

        setUserLoggedIn(true)
        const userCards = await getUserCardsWithRates(user.id)

        if (!userCards || userCards.length === 0) {
          setCardRecommendation(undefined)
          return
        }

        const cardCategory = getCardCategory(scanResult?.category ?? 'General')
        const recommendation = getBestCardRecommendation(userCards, cardCategory)
        setCardRecommendation(recommendation ?? undefined)
      } catch {
        // Silently fail — don't show the block if data isn't available
        setCardRecommendation(undefined)
      }
    }

    fetchCardRecommendation()
  }, [storeState, products.length, scanResult?.category])

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

  const libraryInputRef = useRef<HTMLInputElement>(null)

  function handleCameraCapture() {
    fileInputRef.current?.click()
  }

  function handleLibraryUpload() {
    libraryInputRef.current?.click()
  }

  async function handleProcess() {
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
      handleFindBestPrice(data)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setScanState('error')
    }
  }

  async function handleFindBestPrice(data?: ScanResult) {
    const result = data ?? scanResult
    if (!result) return
    setStoreState('loading')
    setProducts([])

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStoreState('error')
      return
    }

    const matchBody = {
      productName: result.productName,
      category: result.category,
      searchTerms: result.searchTerms,
      visionLabels: result.visionLabels ?? [],
    }
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchBody),
      })
      if (!res.ok) throw new Error('store error')
      const matchData: MatchResults = await res.json()
      setProducts(matchData.results ?? [])
      setShoppingResults(matchData.shoppingResults ?? [])
      setSerpResults(matchData.serpResults ?? [])
      setMatchResult(matchData)
      setStoreState('done')

      // Save to search history (fire-and-forget)
      saveToHistory(result, matchData)
    } catch {
      setStoreState('error')
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
    setShoppingResults([])
    setSerpResults([])
    setMatchResult(null)
    setCardRecommendation(null)
    setUserLoggedIn(null)
  }

  function handleLoadHistoryEntry(entry: SearchHistoryEntry) {
    const matchResults = entry.results as MatchResults
    setScanResult({
      productName: entry.product_name,
      category: entry.product_category,
      confidence: 1,
      searchTerms: [],
      error: null,
    })
    setPreviewUrl(null)
    setProducts(matchResults.results ?? [])
    setShoppingResults(matchResults.shoppingResults ?? [])
    setStoreState('done')
    setCardRecommendation(null)
    setUserLoggedIn(null)
    setScanState('result')
  }

  // Pill-shaped "Scan New Product" button used above results
  function ScanNewProductButton() {
    return (
      <div className="flex justify-center mb-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-full text-white text-sm font-medium shadow-sm transition active:scale-95"
          style={{
            backgroundColor: '#534AB7',
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 20,
            paddingRight: 20,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7F77DD' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#534AB7' }}
        >
          <Camera size={16} />
          Scan New Product
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      {isOffline && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-600 text-center">No internet connection.</p>
        </div>
      )}

      <h1 className="text-2xl font-bold text-foreground mb-6">
        {scanState === 'processing' ? 'Identifying...' : scanState === 'result' ? 'K33pr Results' : 'Scan Product'}
      </h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Library input — no capture, opens photo library on mobile */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
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
              <p className="text-white font-semibold text-base">{isMobile ? 'Take a Photo' : 'Upload a Photo'}</p>
              <p className="text-white/70 text-xs mt-0.5">Photograph the item</p>
            </div>
          </button>

          {isMobile && (
            <div className="text-center">
              <button
                onClick={handleLibraryUpload}
                className="text-sm hover:underline transition"
                style={{ color: '#534AB7' }}
              >
                Upload from Library
              </button>
            </div>
          )}

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

          {/* Recent Searches */}
          {historyLoaded && searchHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-base font-semibold mb-3" style={{ color: '#1a1a1a' }}>Recent Searches</p>
              <div className="space-y-2">
                {searchHistory.map((entry) => {
                  const resultCount = (entry.results?.results ?? []).length
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleLoadHistoryEntry(entry)}
                      className="w-full text-left rounded-lg px-4 py-3 border transition hover:border-primary"
                      style={{ backgroundColor: '#F8F8F6', borderColor: '#E5E5E3' }}
                    >
                      <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                        {entry.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.product_category && (
                          <p className="text-xs" style={{ color: '#666666' }}>{entry.product_category}</p>
                        )}
                        {entry.product_category && (
                          <span className="text-xs" style={{ color: '#E5E5E3' }}>·</span>
                        )}
                        <p className="text-xs" style={{ color: '#666666' }}>
                          {resultCount} result{resultCount !== 1 ? 's' : ''}
                        </p>
                        <span className="text-xs" style={{ color: '#E5E5E3' }}>·</span>
                        <p className="text-xs" style={{ color: '#666666' }}>
                          {formatRelativeTime(entry.created_at)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
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

          {/* Pill button at top of results */}
          <ScanNewProductButton />

          {/* Product identification card — always visible */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            {/* Top row: image + product info */}
            <div className="flex items-center gap-4">
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
                <p className="text-xs text-foreground-secondary mt-1">
                  Typical price range: {getPriceRange(scanResult.category)}
                </p>
              </div>
            </div>

            {/* Card recommendation block — only shown once store results are done */}
            {storeState === 'done' && cardRecommendation !== null && (
              <>
                <div className="border-t border-border" />

                {/* No cards / not logged in: subtle prompt */}
                {userLoggedIn === false && (
                  <p className="text-xs text-foreground-secondary">
                    <Link href="/signup" style={{ color: '#534AB7' }} className="hover:underline">
                      Sign up to see your best card for this purchase
                    </Link>
                  </p>
                )}
                {userLoggedIn === true && cardRecommendation === undefined && (
                  <p className="text-xs text-foreground-secondary">
                    <Link href="/settings" style={{ color: '#534AB7' }} className="hover:underline">
                      Add your cards in Settings to get personalized recommendations
                    </Link>
                  </p>
                )}

                {/* Card recommendation */}
                {cardRecommendation && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wide">
                      Best card for this purchase
                    </p>
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{cardRecommendation.cardName}</p>
                        <p className="text-xs text-foreground-secondary">{cardRecommendation.issuer}</p>
                      </div>
                      <p className="text-sm font-bold text-primary whitespace-nowrap">
                        {cardRecommendation.rate}% cashback
                      </p>
                    </div>

                    {cardRecommendation.isRotating && (
                      <p className="text-xs text-foreground-secondary">
                        ⚠ Rotating category — verify your current quarter
                      </p>
                    )}

                    {cardRecommendation.notes && (
                      <p className="text-xs text-foreground-secondary">{cardRecommendation.notes}</p>
                    )}

                    {/* Combined total row */}
                    {products.length > 0 && (() => {
                      const topResult = products[0]
                      const k33prRatePct = Math.round(topResult.affiliateRate * 100)
                      const cardRatePct = cardRecommendation.rate
                      const totalPct = k33prRatePct + cardRatePct
                      return (
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-foreground-secondary">
                            K33pr commission + {cardRecommendation.cardName}:{' '}
                            <span className="font-semibold text-foreground">
                              {k33prRatePct}% + {cardRatePct}% = {totalPct}% total return
                            </span>
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Retailer engagement banner */}
          {matchResult?.retailerContext && matchResult?.engagementMessage && (
            <RetailerEngagementBanner
              retailerContext={matchResult.retailerContext}
              engagementMessage={matchResult.engagementMessage}
            />
          )}

          {/* Loading indicator while fetching prices */}
          {storeState === 'loading' && (
            <p className="text-[14px] text-center" style={{ color: '#666666' }}>Finding best prices...</p>
          )}

          {storeState === 'done' && products.length === 0 && (
            <p className="text-sm text-center text-foreground-secondary">
              No matching products found{scanResult?.productName ? ` for ${scanResult.productName}` : ''}.
            </p>
          )}

          {storeState === 'done' && products.length > 0 && (
            <div className="space-y-3">

              {/* Price Check section — informational only, no affiliate links or Click IDs */}
              {shoppingResults.length > 0 && (
                <div>
                  {/* Section header */}
                  <p className="text-base font-semibold mb-0.5" style={{ color: '#1a1a1a' }}>Price Check</p>
                  <p className="text-[13px] mb-3" style={{ color: '#666666' }}>
                    Prices from Google Shopping. May not reflect current retailer pricing.
                  </p>

                  {/* Shopping result cards */}
                  <div className="space-y-2">
                    {shoppingResults.slice().sort((a, b) => a.priceValue - b.priceValue).map((item, idx) => (
                      <a
                        key={idx}
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-2xl p-3 border no-underline"
                        style={{ backgroundColor: '#F8F8F6', borderColor: '#E5E5E3' }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ width: 80, height: 80, backgroundColor: '#ffffff', border: '1px solid #E5E5E3' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{ width: 80, height: 80, objectFit: 'contain' }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[14px] leading-snug font-normal overflow-hidden"
                            style={{
                              color: '#1a1a1a',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.title}
                          </p>
                          <p className="text-[18px] font-semibold mt-1" style={{ color: '#1a1a1a' }}>
                            {item.price}
                          </p>
                          {item.merchant && (
                            <p className="text-[13px]" style={{ color: '#666666' }}>
                              from {item.merchant}
                            </p>
                          )}
                          {item.rating !== null && (
                            <p className="text-[13px]" style={{ color: '#666666' }}>
                              {item.rating} ★{item.reviews !== null ? ` (${item.reviews.toLocaleString()})` : ''}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Disclaimer */}
                  <p className="text-[12px] mt-3" style={{ color: '#666666' }}>
                    Prices shown are from Google Shopping and may change. Tap a link below to earn cashback on your purchase.
                  </p>
                </div>
              )}

              {/* SERP Results section */}
              {serpResults.length > 0 && (
                <div>
                  <p className="text-base font-semibold mb-0.5" style={{ color: '#1a1a1a' }}>More Prices</p>
                  <p className="text-[13px] mb-3" style={{ color: '#666666' }}>
                    Prices from across the web. May not reflect current retailer pricing.
                  </p>
                  <div className="space-y-2">
                    {serpResults.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)).map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-2xl p-3 border no-underline"
                        style={{ backgroundColor: '#F8F8F6', borderColor: '#E5E5E3' }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
                          style={{ width: 80, height: 80, backgroundColor: '#ffffff', border: '1px solid #E5E5E3' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            style={{ width: 80, height: 80, objectFit: 'contain' }}
                          />
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[14px] leading-snug font-normal overflow-hidden"
                            style={{
                              color: '#1a1a1a',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.title}
                          </p>
                          {item.price !== null && (
                            <p className="text-[18px] font-semibold mt-1" style={{ color: '#1a1a1a' }}>
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price)}
                            </p>
                          )}
                          {item.retailerDomain && (
                            <p className="text-[13px]" style={{ color: '#666666' }}>
                              {item.retailerDomain}
                            </p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}


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
                onClick={() => handleFindBestPrice()}
                className="text-sm text-primary font-medium hover:opacity-80 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {storeState === 'done' && products.length > 0 && (
            <p className="text-xs text-center text-foreground-secondary">
              K33pr may earn a small commission when you make a purchase through links on this site. This does not affect the price you pay. Commissions help support the operation of K33pr.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
