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

  // Context query state
  const [contextQuery, setContextQuery] = useState('')
  const [showContextInput, setShowContextInput] = useState(false)
  const [contextAdvisory, setContextAdvisory] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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
    <div className="bg-background px-5 pt-12 pb-24">
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

          </div>

          {/* Retailer engagement banner */}
          {matchResult?.retailerContext && matchResult?.engagementMessage && (
            <RetailerEngagementBanner
              retailerContext={matchResult.retailerContext}
              engagementMessage={matchResult.engagementMessage}
            />
          )}

          {/* Context query input — between product card and More Prices */}
          {storeState === 'done' && displayedSerpResults.length > 0 && (
            <div className="space-y-2">
              {!showContextInput ? (
                <button
                  onClick={() => setShowContextInput(true)}
                  className="flex items-center gap-1.5 w-full text-left"
                >
                  <span className="text-sm text-foreground-secondary">Ask about these results...</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M5 3L9 7L5 11" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={contextQuery}
                      onChange={(e) => setContextQuery(e.target.value)}
                      placeholder="e.g. need this by Friday, gift under $30"
                      className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      onClick={async () => {
                        if (!contextQuery.trim() || isAnalyzing) return
                        setIsAnalyzing(true)
                        setContextAdvisory(null)
                        try {
                          const response = await fetch('/api/match/context', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              contextQuery: contextQuery.trim(),
                              serpResults: displayedSerpResults,
                              productName: scanResult?.productName ?? '',
                            }),
                          })
                          const json = await response.json()
                          if (json.advisory) {
                            setContextAdvisory(json.advisory)
                          }
                        } catch {
                          setContextAdvisory('Unable to analyze. Please try again.')
                        } finally {
                          setIsAnalyzing(false)
                        }
                      }}
                      disabled={!contextQuery.trim() || isAnalyzing}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-white transition"
                      style={{
                        backgroundColor: !contextQuery.trim() || isAnalyzing ? '#A9A4D8' : '#534AB7',
                        cursor: !contextQuery.trim() || isAnalyzing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Analyzing...
                        </span>
                      ) : 'Analyze'}
                    </button>
                  </div>

                  {contextAdvisory && (
                    <div className="mx-4 mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                      <div className="mb-1 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#534AB7]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">K33pr Advisory</span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-800">{contextAdvisory}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              {displayedSerpResults.length > 0 && (
                <div>
                  <p className="text-base font-semibold mb-0.5" style={{ color: '#1a1a1a' }}>More Prices</p>
                  <p className="text-[13px] mb-3" style={{ color: '#666666' }}>
                    Prices from across the web. May not reflect current retailer pricing.
                  </p>
                  <div className="space-y-2">
                    {displayedSerpResults.slice().sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)).map((item, idx) => {
                      const id = `${item.engine}-${item.url}`
                      const isExpanded = expandedResultId === id
                      return (
                        <div
                          key={idx}
                          className="relative rounded-2xl border overflow-hidden"
                          style={{ backgroundColor: '#F8F8F6', borderColor: '#E5E5E3' }}
                        >
                          {/* Tappable card content */}
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setExpandedResultId(isExpanded ? null : id)}
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
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {item.price !== null && (
                                  <p className="text-[18px] font-semibold" style={{ color: '#1a1a1a' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price)}
                                  </p>
                                )}
                                {item.retailerDomain === 'amazon.com' && item.in_stock === true && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                    In Stock
                                  </span>
                                )}
                                {item.retailerDomain === 'amazon.com' && item.in_stock === false && (
                                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              {item.retailerDomain && (
                                <p className="text-[13px]" style={{ color: '#666666' }}>
                                  {item.retailerDomain}
                                </p>
                              )}
                              {item.retailerDomain === 'amazon.com' && item.delivery && item.delivery.length > 0 && (
                                <p className="text-xs mt-0.5" style={{ color: '#666666' }}>
                                  {item.delivery[0]}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Expanded action panel */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-2">
                              {/* Keepa price history section */}
                              {(() => {
                                const asin = extractAsinFromUrl(item.url)
                                if (!asin) return null
                                if (item.engine !== 'amazon' && item.retailerDomain !== 'amazon.com') return null

                                const isLoading = keepaLoadingAsins.has(asin)
                                const isRequested = keepaRequestedAsins.has(asin)
                                const kd = keepaDataByAsin[asin]

                                return (
                                  <div className="border-t border-gray-100 pt-3 pb-1">
                                    {!isRequested && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); fetchKeepaData(asin) }}
                                        className="w-full rounded-md border border-indigo-200 px-4 py-2 text-sm font-medium text-[#534AB7] hover:bg-indigo-50 transition-colors"
                                      >
                                        View Price History
                                      </button>
                                    )}

                                    {isRequested && isLoading && (
                                      <div className="py-3 text-center text-xs text-gray-400">Loading price history...</div>
                                    )}

                                    {isRequested && !isLoading && kd === null && (
                                      <div className="py-2 text-center text-xs text-gray-400">Price history unavailable for this product.</div>
                                    )}

                                    {isRequested && !isLoading && kd !== null && (() => {
                                      const chartData = kd.priceHistory90Days.map(p => ({
                                        date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        price: p.price,
                                      }))

                                      return (
                                        <div>
                                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price History (90 days)</p>

                                          {chartData.length > 1 && (
                                            <ResponsiveContainer width="100%" height={120}>
                                              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                                <XAxis
                                                  dataKey="date"
                                                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                                                  tickLine={false}
                                                  axisLine={false}
                                                  interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                                                  tickLine={false}
                                                  axisLine={false}
                                                  tickFormatter={(v) => `$${v}`}
                                                  domain={['auto', 'auto']}
                                                />
                                                <Tooltip
                                                  formatter={(value) => {
                                                    const num = typeof value === 'number' ? value : Number(value)
                                                    return [`$${num.toFixed(2)}`, 'Price']
                                                  }}
                                                  labelStyle={{ fontSize: 10 }}
                                                  contentStyle={{ fontSize: 10, borderRadius: 6 }}
                                                />
                                                <Line
                                                  type="monotone"
                                                  dataKey="price"
                                                  stroke="#534AB7"
                                                  strokeWidth={2}
                                                  dot={false}
                                                  activeDot={{ r: 3 }}
                                                />
                                              </LineChart>
                                            </ResponsiveContainer>
                                          )}

                                          <div className="flex gap-3 mt-2 flex-wrap">
                                            {kd.currentBuyBox !== null && (
                                              <div className="text-center">
                                                <p className="text-xs text-gray-400">Current</p>
                                                <p className="text-sm font-semibold text-gray-900">${kd.currentBuyBox.toFixed(2)}</p>
                                              </div>
                                            )}
                                            {kd.avg90 !== null && (
                                              <div className="text-center">
                                                <p className="text-xs text-gray-400">90-day avg</p>
                                                <p className="text-sm font-semibold text-gray-900">${kd.avg90.toFixed(2)}</p>
                                              </div>
                                            )}
                                            {kd.allTimeLow !== null && (
                                              <div className="text-center">
                                                <p className="text-xs text-gray-400">All-time low</p>
                                                <p className="text-sm font-semibold text-gray-900">${kd.allTimeLow.toFixed(2)}</p>
                                              </div>
                                            )}
                                            {kd.percentVsAvg90 !== null && (
                                              <div className="text-center">
                                                <p className="text-xs text-gray-400">vs 90-day avg</p>
                                                <p className={`text-sm font-semibold ${kd.percentVsAvg90 <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                  {kd.percentVsAvg90 <= 0 ? '↓' : '↑'} {Math.abs(kd.percentVsAvg90)}%
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )
                              })()}

                              {trackedIds.has(id) ? (
                                <div className="text-center text-sm font-medium text-green-600">Tracked ✓</div>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleTrack(item, false) }}
                                    disabled={trackingInProgress.has(id)}
                                    className="w-full rounded-md bg-[#534AB7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                  >
                                    {trackingInProgress.has(id) ? 'Adding...' : 'Track Price'}
                                  </button>

                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (isAggressiveEligible(item)) { handleTrack(item, true) } }}
                                    disabled={!isAggressiveEligible(item) || trackingInProgress.has(id)}
                                    className={`w-full rounded-md px-4 py-2 text-sm font-medium ${
                                      isAggressiveEligible(item)
                                        ? 'bg-indigo-100 text-[#534AB7]'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {isAggressiveEligible(item)
                                      ? 'Aggressively Track'
                                      : 'Available for items over $100 or electronics, appliances, gaming, or furniture'}
                                  </button>

                                  {bestCardLoadingIds.has(id) ? (
                                    <div className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 text-center">
                                      Finding best card...
                                    </div>
                                  ) : id in bestCardByResultId ? (
                                    bestCardByResultId[id] ? (
                                      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3">
                                        <p className="text-xs text-gray-500">Best card for {item.retailerDomain}</p>
                                        <p className="text-sm font-semibold text-gray-900">{bestCardByResultId[id]!.cardName}</p>
                                        <p className="text-xs text-[#534AB7]">{bestCardByResultId[id]!.rate}% cashback</p>
                                      </div>
                                    ) : (
                                      <div className="rounded-md border border-gray-200 px-4 py-3 text-sm text-gray-500">
                                        No cards saved — add cards in Settings
                                      </div>
                                    )
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleBestCard(item, id) }}
                                      className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                                    >
                                      Best Card
                                    </button>
                                  )}

                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="block w-full rounded-md border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700"
                                  >
                                    Buy ↗
                                  </a>
                                </>
                              )}
                            </div>
                          )}

                          {/* Dismiss button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDismissSerpResult(item)
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#D1D1CF' }}
                            aria-label="Dismiss result"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L9 9M9 1L1 9" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
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
