/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera } from 'lucide-react'
import type { AffiliateResult } from '@/lib/affiliates/types'
import type { ShoppingResult } from '@/lib/shopping/types'
import type { SerpResult } from '@/lib/search/serp-multi-search'
import type { KeepaProductData } from '@/lib/keepa/keepa-fetch'
import { createClient } from '@/lib/supabase/client'
import { RetailerEngagementBanner } from '@/components/RetailerEngagementBanner'
import { getUserCardsWithRates } from '@/lib/cards/actions'
import { getBestCardRecommendation } from '@/lib/cards/recommender'
import { getCardCategory } from '@/lib/cards/categoryMap'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useScanSaved } from '@/lib/scan-saved-context'

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
  category: string | null
  results_payload: MatchResults
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

function cleanDomain(raw: string): string {
  return raw
    .replace(/^www\./i, '')
    .replace(/\.(com|co\.uk|org|net|co)$/i, '')
    .replace(/^./, c => c.toUpperCase())
}

function extractAsinFromUrl(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/)
  return match ? match[1] : null
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
  const searchParams = useSearchParams()
  const { notifyScanSaved } = useScanSaved()

  const resumeId = searchParams.get('resume')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isResuming, setIsResuming] = useState(!!resumeId)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [storeState, setStoreState] = useState<StoreState>('idle')
  const [products, setProducts] = useState<(AffiliateResult & { clickId?: string })[]>([])
  const [shoppingResults, setShoppingResults] = useState<ShoppingResult[]>([])
  const [matchResult, setMatchResult] = useState<MatchResults | null>(null)
  const [displayedSerpResults, setDisplayedSerpResults] = useState<SerpResult[]>([])
  const [isOffline, setIsOffline] = useState(false)

  // Expanded result card state
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null)
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set())
  const [trackingInProgress, setTrackingInProgress] = useState<Set<string>>(new Set())

  // Best card state
  const [bestCardByResultId, setBestCardByResultId] = useState<Record<string, { cardName: string; issuer: string; rate: number } | null>>({})
  const [bestCardLoadingIds, setBestCardLoadingIds] = useState<Set<string>>(new Set())

  // Keepa price history state
  const [keepaDataByAsin, setKeepaDataByAsin] = useState<Record<string, KeepaProductData | null>>({})
  const [keepaLoadingAsins, setKeepaLoadingAsins] = useState<Set<string>>(new Set())
  const [keepaRequestedAsins, setKeepaRequestedAsins] = useState<Set<string>>(new Set())

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
        .from('scan_history')
        .select('id, product_name, category, results_payload, created_at')
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

  useEffect(() => {
    const resumeId = searchParams.get('resume')
    if (!resumeId) return

    let isMounted = true

    setIsResuming(true)
    setDisplayedSerpResults([])
    setMatchResult(null)
    setProducts([])
    setShoppingResults([])

    const supabase = createClient()
    supabase
      .from('scan_history')
      .select('id, product_name, category, results_payload, created_at')
      .eq('id', resumeId)
      .single()
      .then(({ data, error }: { data: SearchHistoryEntry | null; error: unknown }) => {
        if (!isMounted) return
        console.log('[RESUME DEBUG] fetched row:', JSON.stringify(data, null, 2))
        if (!error && data && data.results_payload) {
          handleLoadHistoryEntry(data)
        }
        setIsResuming(false)
        window.history.replaceState({}, '', '/scan')
      }, () => {
        if (!isMounted) return
        setIsResuming(false)
      })

    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('resume')])

  // Save to search history after successful match results
  const saveToHistory = useCallback(async (
    scan: ScanResult,
    matchResults: MatchResults
  ) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !scan.productName) return

      await supabase.from('scan_history').insert({
        user_id: user.id,
        product_name: scan.productName,
        category: scan.category ?? null,
        results_payload: matchResults as unknown as Record<string, unknown>,
      })

      // Refresh history list
      loadSearchHistory()
    } catch {
      // Non-fatal
    }
  }, [loadSearchHistory])

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
      const newSerpResults = matchData.serpResults ?? []
      setDisplayedSerpResults(newSerpResults)
      setMatchResult(matchData)
      setStoreState('done')

      // Save to search history (fire-and-forget)
      saveToHistory(result, matchData)
      notifyScanSaved()
    } catch {
      setStoreState('error')
    }
  }

  async function handleDismissSerpResult(item: SerpResult) {
    // Optimistic update
    setDisplayedSerpResults(prev => prev.filter(r => r.url !== item.url))

    // Fire-and-forget persist
    try {
      await fetch('/api/results/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: scanResult?.productName ?? '',
          resultUrl: item.url,
          resultTitle: item.title,
        }),
      })
    } catch {
      // Non-fatal
    }
  }

  async function handleTrack(result: SerpResult, aggressive: boolean) {
    const id = `${result.engine}-${result.url}`
    if (trackingInProgress.has(id)) return

    setTrackingInProgress(prev => new Set(prev).add(id))

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/tracker/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          productName: matchResult?.engagementMessage ? (scanResult?.productName ?? result.title) : (matchResult?.results?.[0] ? (scanResult?.productName ?? result.title) : result.title),
          price: result.price ?? 0,
          category: scanResult?.category ?? 'general',
          retailerDomain: result.retailerDomain ?? '',
          url: result.url,
          aggressive,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTrackedIds(prev => new Set(prev).add(id))
      } else {
        alert(data.message ?? 'Could not track this item.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setTrackingInProgress(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function isAggressiveEligible(result: SerpResult): boolean {
    const highVolatilityCategories = ['electronics', 'appliances', 'gaming', 'furniture']
    const category = (scanResult?.category ?? '').toLowerCase()
    return (result.price ?? 0) >= 100 || highVolatilityCategories.includes(category)
  }

  async function handleBestCard(result: SerpResult, id: string) {
    // Already loaded — do nothing
    if (id in bestCardByResultId) return
    // Already loading
    if (bestCardLoadingIds.has(id)) return

    setBestCardLoadingIds(prev => new Set(prev).add(id))

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBestCardByResultId(prev => ({ ...prev, [id]: null }))
        return
      }

      const userCards = await getUserCardsWithRates(user.id)
      if (!userCards || userCards.length === 0) {
        setBestCardByResultId(prev => ({ ...prev, [id]: null }))
        return
      }

      // Derive card category from retailer domain using getCardCategory
      const retailerDomain = result.retailerDomain ?? ''
      const cardCategory = getCardCategory(retailerDomain)

      const recommendation = getBestCardRecommendation(userCards, cardCategory)
      if (!recommendation) {
        setBestCardByResultId(prev => ({ ...prev, [id]: null }))
        return
      }

      setBestCardByResultId(prev => ({
        ...prev,
        [id]: {
          cardName: recommendation.cardName,
          issuer: recommendation.issuer,
          rate: recommendation.rate,
        },
      }))
    } catch {
      setBestCardByResultId(prev => ({ ...prev, [id]: null }))
    } finally {
      setBestCardLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function fetchKeepaData(asin: string) {
    if (Object.prototype.hasOwnProperty.call(keepaDataByAsin, asin) || keepaLoadingAsins.has(asin)) return

    setKeepaLoadingAsins(prev => new Set(prev).add(asin))
    setKeepaRequestedAsins(prev => new Set(prev).add(asin))

    try {
      const res = await fetch(`/api/keepa/product?asin=${asin}`)
      const json = await res.json()
      setKeepaDataByAsin(prev => ({ ...prev, [asin]: json.data ?? null }))
    } catch {
      setKeepaDataByAsin(prev => ({ ...prev, [asin]: null }))
    } finally {
      setKeepaLoadingAsins(prev => {
        const next = new Set(prev)
        next.delete(asin)
        return next
      })
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
    setDisplayedSerpResults([])
    setMatchResult(null)
    setExpandedResultId(null)
    setTrackedIds(new Set())
    setBestCardByResultId({})
    setBestCardLoadingIds(new Set())
    setKeepaDataByAsin({})
    setKeepaLoadingAsins(new Set())
    setKeepaRequestedAsins(new Set())
  }

  function handleLoadHistoryEntry(entry: SearchHistoryEntry) {
    const matchResults = entry.results_payload as MatchResults
    setScanResult({
      productName: entry.product_name,
      category: entry.category,
      confidence: 1,
      searchTerms: [],
      error: null,
    })
    setPreviewUrl(null)
    setProducts(matchResults.results ?? [])
    setShoppingResults(matchResults.shoppingResults ?? [])
    setDisplayedSerpResults(matchResults.serpResults ?? [])
    setMatchResult(matchResults)
    setStoreState('done')
    setScanState('result')
  }

  // Auto-fetch best card when results are ready
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (storeState !== 'done') return
    const allResults = [...displayedSerpResults].filter(r => r.price !== null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    if (allResults.length === 0) return
    const cheapest = allResults[0]
    const id = `${cheapest.engine}-${cheapest.url}`
    if (id in bestCardByResultId || bestCardLoadingIds.has(id)) return
    handleBestCard(cheapest, id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState, displayedSerpResults])

  return (
    <div className="bg-background px-5 pt-12 pb-24">
      {isOffline && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-600 text-center">No internet connection.</p>
        </div>
      )}

      {!isResuming && scanState !== 'result' && (
        <h1 className="text-2xl font-bold text-foreground mb-6">
          {scanState === 'processing' ? 'Identifying...' : 'Scan Product'}
        </h1>
      )}

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

      {isResuming && (
        <div className="flex items-center justify-center pt-32">
          <div className="text-sm text-foreground-secondary">Loading...</div>
        </div>
      )}

      {!isResuming && scanState === 'idle' && (
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
                  const resultCount = (entry.results_payload?.results ?? []).length
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
                        {entry.category && (
                          <p className="text-xs" style={{ color: '#666666' }}>{entry.category}</p>
                        )}
                        {entry.category && (
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

      {scanState === 'result' && scanResult && !isResuming && (
        <div className="space-y-3">

          {/* Product header row with scan-new button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{scanResult.productName}</p>
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                {scanResult.category ?? 'Product'} · typical {getPriceRange(scanResult.category)}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#534AB7' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4" fill="white"/></svg>
            </button>
          </div>

          {/* 3. LOADING STATE */}
          {storeState === 'loading' && (
            <p className="text-[14px] text-center" style={{ color: '#666666' }}>Finding best prices...</p>
          )}

          {/* 4. NO RESULTS STATE */}
          {storeState === 'done' && products.length === 0 && (
            <p className="text-sm text-center text-foreground-secondary">
              No matching products found{scanResult?.productName ? ` for ${scanResult.productName}` : ''}.
            </p>
          )}

          {/* 5. RESULTS BODY */}
          {storeState === 'done' && (shoppingResults.length > 0 || displayedSerpResults.length > 0) && (() => {
            const allPriced: { price: number; priceFormatted: string; domain: string; url: string; isShopping: boolean; item: ShoppingResult | SerpResult }[] = []

            for (const s of shoppingResults) {
              allPriced.push({
                price: s.priceValue,
                priceFormatted: s.price,
                domain: s.merchant,
                url: s.productUrl,
                isShopping: true,
                item: s,
              })
            }
            for (const s of displayedSerpResults) {
              if (s.price !== null) {
                allPriced.push({
                  price: s.price,
                  priceFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(s.price),
                  domain: s.retailerDomain ?? '',
                  url: s.url,
                  isShopping: false,
                  item: s,
                })
              }
            }
            allPriced.sort((a, b) => a.price - b.price)

            const best = allPriced[0]
            if (!best) return null
            const rest = allPriced.slice(1)
            const totalSearched = shoppingResults.length + displayedSerpResults.length

            const bestSerpItem = !best.isShopping ? (best.item as SerpResult) : null
            const bestId = bestSerpItem ? `${bestSerpItem.engine}-${bestSerpItem.url}` : null

            const bestDomain = best.domain.replace(/^www\./i, '')
            const bestCardKey = bestId ?? `shopping-${best.url}`
            const bestCardData = bestCardByResultId[bestCardKey] ?? null
            const cardRate = bestCardData?.rate ?? 0
            const cardSavings = best.price * (cardRate / 100)
            const netCost = best.price - cardSavings
            const netCostFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netCost)
            const cardSavingsFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cardSavings)

            return (
              <>
                {/* ─── BEST VERIFIED PRICE CARD ─── */}
                <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#ebebeb' }}>
                  <div style={{ padding: '14px 14px 10px' }}>
                    <div className="flex items-start justify-between" style={{ marginBottom: '6px' }}>
                      <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Best verified price</p>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                    </div>
                    <p style={{ fontSize: '28px', fontWeight: 500, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>{best.priceFormatted}</p>
                    {cardRate > 0 && (
                      <div>
                        <div className="flex items-center gap-1" style={{ marginTop: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 500, color: '#1D9E75' }}>{netCostFormatted} net</span>
                          <span style={{ fontSize: '9px', backgroundColor: '#E1F5EE', color: '#085041', borderRadius: '3px', padding: '1px 5px' }}>after card savings</span>
                        </div>
                        <div className="flex items-center justify-between" style={{ backgroundColor: '#f8f8f8', borderRadius: '6px', padding: '5px 8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', color: '#888' }}>{bestCardData!.cardName} ({cardRate}%)</span>
                          <span style={{ fontSize: '11px', fontWeight: 500, color: '#1D9E75' }}>−{cardSavingsFormatted}</span>
                        </div>
                      </div>
                    )}
                    <p style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>
                      {cleanDomain(best.domain)}
                      {bestSerpItem?.delivery && bestSerpItem.delivery.length > 0 ? ` · ${bestSerpItem.delivery[0]}` : ''}
                    </p>
                  </div>

                  {/* Stat bar */}
                  <div className="flex" style={{ borderTop: '0.5px solid #f0f0f0' }}>
                    <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                      <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>90-day low</p>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>—</p>
                    </div>
                    <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                      <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>vs low</p>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>—</p>
                    </div>
                    <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                      <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>searched</p>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>{totalSearched}</p>
                    </div>
                    <div className="flex-1" style={{ padding: '8px 6px' }}>
                      <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>net cost</p>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D9E75' }}>{cardRate > 0 ? netCostFormatted : best.priceFormatted}</p>
                    </div>
                  </div>
                </div>

                {/* ─── ACTION BUTTONS ─── */}
                <div>
                  {bestSerpItem && bestId && !trackedIds.has(bestId) && (
                    <>
                      <button
                        onClick={() => handleTrack(bestSerpItem, false)}
                        disabled={trackingInProgress.has(bestId)}
                        className="w-full rounded-xl py-3 text-sm font-medium text-white"
                        style={{ backgroundColor: '#534AB7', marginBottom: '8px' }}
                      >
                        {trackingInProgress.has(bestId) ? 'Adding...' : 'Track price'}
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { if (bestSerpItem && isAggressiveEligible(bestSerpItem)) handleTrack(bestSerpItem, true) }}
                          disabled={!bestSerpItem || !isAggressiveEligible(bestSerpItem) || (bestId ? trackingInProgress.has(bestId) : false)}
                          className="flex-1 rounded-xl py-3 text-sm text-center border disabled:opacity-40"
                          style={{ color: '#555', borderColor: '#e0e0e0' }}
                        >
                          Aggressively track
                        </button>
                        <a
                          href={bestSerpItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-xl py-3 text-sm text-center border no-underline"
                          style={{ color: '#555', borderColor: '#e0e0e0' }}
                        >
                          Buy ↗
                        </a>
                      </div>
                    </>
                  )}
                  {bestId && trackedIds.has(bestId) && (
                    <div className="text-center text-sm font-medium" style={{ color: '#1D9E75' }}>Tracked ✓</div>
                  )}
                  {best.isShopping && (
                    <>
                      <a
                        href={(best.item as ShoppingResult).productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full rounded-xl py-3 text-sm font-medium text-white text-center no-underline"
                        style={{ backgroundColor: '#534AB7', marginBottom: '8px' }}
                      >
                        View Deal ↗
                      </a>
                    </>
                  )}
                </div>

                {/* ─── FLAT PRICE LIST ─── */}
                {rest.length > 0 && (
                  <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#ebebeb' }}>
                    {rest.map((r, idx) => (
                      <a
                        key={idx}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between no-underline"
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx < rest.length - 1 ? '0.5px solid #f5f5f5' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#555' }}>{r.domain.replace(/^www\./i, '').replace(/\.(com|co\.uk|org|net|co)$/i, '').replace(/^./, c => c.toUpperCase())}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: idx === 0 ? '#534AB7' : '#111' }}>
                          {r.priceFormatted}{idx === 0 ? ' ✓' : ''}
                        </span>
                      </a>
                    ))}
                    {(() => {
                      const totalAll = shoppingResults.length + displayedSerpResults.length
                      const shown = 1 + rest.length
                      const filtered = totalAll - shown
                      if (filtered <= 0) return null
                      return (
                        <div className="flex items-center justify-between" style={{ padding: '10px 14px', borderTop: '0.5px solid #f5f5f5' }}>
                          <span style={{ fontSize: '13px', color: '#aaa' }}>{filtered} filtered</span>
                          <span style={{ fontSize: '13px', color: '#534AB7', fontWeight: 500 }}>Show</span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Affiliate disclosure */}
                <p className="text-xs text-center text-foreground-secondary">
                  K33pr may earn a small commission when you make a purchase through links on this site. This does not affect the price you pay. Commissions help support the operation of K33pr.
                </p>
              </>
            )
          })()}

          {/* 6. STORE ERROR STATE */}
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
        </div>
      )}
    </div>
  )
}
