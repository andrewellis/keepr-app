/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import type { LensResult } from '@/lib/affiliates/google-lens'
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
import { selectPicks } from '@/lib/search/pick-selector'
import type { PickSet } from '@/lib/search/pick-selector'
import { getRetailerTrust } from '@/lib/search/retailer-trust'
import { getBuyTiming, getBuyTimingColor, getBuyTimingLabel } from '@/lib/keepa/buy-timing'
import CameraViewfinder from '@/components/CameraViewfinder'

type ScanState = 'idle' | 'preview' | 'processing' | 'result' | 'error' | 'disambiguation'
type StoreState = 'idle' | 'loading' | 'done' | 'error'

interface ScanResult {
  productName: string | null
  category: string | null
  confidence: number
  searchTerms: string[]
  visionLabels?: string[]
  error: string | null
  lensResults?: LensResult[]
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
    enginesQueried?: string[];
    enginesSucceeded?: string[];
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function ScanClient() {
  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobileViewport(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const { notifyScanSaved } = useScanSaved()

  const resumeId = searchParams.get('resume')
  const loadedResumeIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verdictStickyRef = useRef<HTMLDivElement>(null)
  const [verdictHeight, setVerdictHeight] = useState(0)
  const [isResuming, setIsResuming] = useState(!!resumeId)
  const [lensResults, setLensResults] = useState<LensResult[]>([])
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

  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number>(0)
  const [mobileManualSelect, setMobileManualSelect] = useState<boolean>(false)
  const [showAllPrices, setShowAllPrices] = useState(false)
  const [showHeroChart, setShowHeroChart] = useState(false)
  const [userDismissedChart, setUserDismissedChart] = useState(false)
  const [desktopPickIdx, setDesktopPickIdx] = useState<number>(1)
  const [mobilePickIdx, setMobilePickIdx] = useState<number>(1)
  const [desktopTableExpanded, setDesktopTableExpanded] = useState(false)

  useEffect(() => {
    setSelectedPriceIdx(0)
    setShowAllPrices(false)
    setShowHeroChart(false)
    setUserDismissedChart(false)
    setMobileManualSelect(false)
  }, [storeState])

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
    if (resumeId === loadedResumeIdRef.current) return

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
          if (isResuming) setIsResuming(false)
        }
        window.history.replaceState({}, '', '/scan?resume=' + resumeId)
      }, () => {
        if (!isMounted) return
      })

    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('resume')])

  const handlePopState = () => {
    const url = new URL(window.location.href)
    const resumeId = url.searchParams.get('resume')
    if (!resumeId) return

    const supabase = createClient()
    supabase
      .from('scan_history')
      .select('id, product_name, category, results_payload, created_at')
      .eq('id', resumeId)
      .single()
      .then(({ data, error }: { data: SearchHistoryEntry | null; error: unknown }) => {
        if (!error && data && data.results_payload) {
          handleLoadHistoryEntry(data)
        }
      })
  }

  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const textQuery = searchParams.get('q')
    if (!textQuery) return

    setPreviewUrl(null)
    setCurrentFile(null)
    setErrorMsg(null)
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

    const syntheticResult: ScanResult = {
      productName: textQuery,
      category: 'General',
      confidence: 1,
      searchTerms: [textQuery],
      error: null,
    }

    setScanResult(syntheticResult)
    setScanState('result')
    handleFindBestPrice(syntheticResult)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Save to search history after successful match results
  const saveToHistory = useCallback(async (
    scan: ScanResult,
    matchResults: MatchResults
  ) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !scan.productName) return

      const { data: insertedRow } = await supabase.from('scan_history').insert({
        user_id: user.id,
        product_name: scan.productName,
        category: scan.category ?? null,
        results_payload: matchResults as unknown as Record<string, unknown>,
      }).select('id').single()

      if (insertedRow?.id) {
        window.history.pushState({}, '', '/scan?resume=' + insertedRow.id)
      }

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

  function handleCameraFrameCapture(file: File) {
    setCurrentFile(file)
    handleProcess(file)
  }

  function handleLibraryFileSelect(file: File) {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setCurrentFile(file)
    setScanState('preview')
  }

  async function handleProcess(fileOverride?: File) {
    const file = fileOverride || currentFile
    if (!file) return
    setScanState('processing')

    // Check network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('No internet connection. Please check your network and try again.')
      setScanState('error')
      return
    }

    try {
      const compressed = await compressImage(file)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Image compressed: ${file.size} → ${compressed.size} bytes`)
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
      if (data.lensResults && data.lensResults.length > 1) {
        setLensResults(data.lensResults)
        setScanState('disambiguation')
        // Do NOT call handleFindBestPrice yet
      } else {
        setScanState('result')
        handleFindBestPrice(data)
      }
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

      const cardCategory = getCardCategory(scanResult?.category ?? 'General')

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

  const cleanLensTitle = (title: string) =>
    title.replace(/\s*[|–—-]\s*[^|–—-]+$/, '').trim()

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
    setLensResults([])
  }

  function handleLoadHistoryEntry(entry: SearchHistoryEntry) {
    loadedResumeIdRef.current = entry.id
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
    const sorted = [...displayedSerpResults].filter(r => r.price !== null).sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    const top = sorted.slice(0, 5)
    for (const r of top) {
      const id = `${r.engine}-${r.url}`
      if (id in bestCardByResultId || bestCardLoadingIds.has(id)) continue
      handleBestCard(r, id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState, displayedSerpResults])

  // Auto-fetch Keepa data for Amazon results so "Price history" button appears immediately
  useEffect(() => {
    if (storeState !== 'done') return
    for (const s of displayedSerpResults) {
      if (s.retailerDomain === 'amazon.com' || s.engine === 'amazon') {
        const asin = extractAsinFromUrl(s.url)
        if (asin) fetchKeepaData(asin)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState, displayedSerpResults])

  // Auto-show Keepa chart when Amazon result has data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (storeState !== 'done') return
    // Check if any Amazon result has Keepa data loaded
    const amazonWithKeepa = displayedSerpResults.find(s => {
      if (s.retailerDomain !== 'amazon.com' && s.engine !== 'amazon') return false
      const asin = extractAsinFromUrl(s.url)
      return asin && keepaDataByAsin[asin] && keepaDataByAsin[asin]!.priceHistory90Days.length > 1
    })
    if (!amazonWithKeepa) return
    // Only auto-show if chart is not already showing (avoid overriding user toggle)
    if (showHeroChart || userDismissedChart) return
    // Build the combined sorted price array to find the correct index
    const allPricedCalc: { price: number; domain: string; url: string; isShopping: boolean }[] = []
    for (const s of shoppingResults) {
      allPricedCalc.push({ price: s.priceValue, domain: s.merchant, url: s.productUrl, isShopping: true })
    }
    for (const s of displayedSerpResults) {
      if (s.price !== null) {
        allPricedCalc.push({ price: s.price, domain: s.retailerDomain ?? '', url: s.url, isShopping: false })
      }
    }
    allPricedCalc.sort((a, b) => a.price - b.price)
    const amazonIdx = allPricedCalc.findIndex(p => p.url === amazonWithKeepa.url)
    if (amazonIdx >= 0) {
      setSelectedPriceIdx(amazonIdx)
      setShowHeroChart(true)
    }
  }, [keepaDataByAsin, storeState, displayedSerpResults, shoppingResults, showHeroChart, userDismissedChart])

  useEffect(() => {
    if (verdictStickyRef.current) {
      const obs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setVerdictHeight(entry.contentRect.height + 16)
        }
      })
      obs.observe(verdictStickyRef.current)
      return () => obs.disconnect()
    }
  }, [scanState])

  return (
    <div className="bg-background px-5 pt-4 pb-24 md:px-8">
      {isOffline && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-600 text-center">No internet connection.</p>
        </div>
      )}

      {!isResuming && scanState !== 'result' && (
        <h1 className={`text-2xl font-bold text-foreground mb-6 ${scanState === 'idle' ? 'hidden md:block' : ''}`}>
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
        <>
          {/* Mobile: live camera viewfinder */}
          <div className="md:hidden" style={{ margin: '0 -20px -96px', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            {isMobileViewport && (
              <CameraViewfinder
                onCapture={handleCameraFrameCapture}
                onLibrarySelect={handleLibraryFileSelect}
              />
            )}
          </div>

          {/* Desktop: keep existing upload UI */}
          <div className="hidden md:block space-y-3">
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
                <p className="text-white font-semibold text-base">Upload a Photo</p>
                <p className="text-white/70 text-xs mt-0.5">Photograph the item</p>
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
        </>
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
              onClick={() => handleProcess()}
              className="flex-1 bg-primary rounded-xl py-3.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              Identify Product
            </button>
          </div>
        </div>
      )}

      {scanState === 'processing' && (
        <>
          <div className="md:hidden">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, gap: 12 }}>
              {/* Scanner box with corner brackets */}
              <div style={{ width: 120, height: 120, borderRadius: 14, background: '#fff', border: '0.5px solid #e5e5e5', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ width: 90, height: 90, background: '#f0f0f0', borderRadius: 7 }} />
                {/* Four corner brackets */}
                <div style={{ position: 'absolute', top: 5, left: 5, width: 12, height: 12, borderTop: '2px solid #534AB7', borderLeft: '2px solid #534AB7', borderRadius: '2px 0 0 0' }} />
                <div style={{ position: 'absolute', top: 5, right: 5, width: 12, height: 12, borderTop: '2px solid #534AB7', borderRight: '2px solid #534AB7', borderRadius: '0 2px 0 0' }} />
                <div style={{ position: 'absolute', bottom: 5, left: 5, width: 12, height: 12, borderBottom: '2px solid #534AB7', borderLeft: '2px solid #534AB7', borderRadius: '0 0 0 2px' }} />
                <div style={{ position: 'absolute', bottom: 5, right: 5, width: 12, height: 12, borderBottom: '2px solid #534AB7', borderRight: '2px solid #534AB7', borderRadius: '0 0 2px 0' }} />
                {/* Scanning line animation */}
                <div style={{ position: 'absolute', top: '50%', left: 5, right: 5, height: 1, background: '#534AB7', opacity: 0.5 }} className="animate-pulse" />
              </div>
              {/* Text */}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 4 }}>Identifying product...</p>
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                  <span className="animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#534AB7', display: 'inline-block', animationDelay: '0s' }} />
                  <span className="animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#534AB7', display: 'inline-block', animationDelay: '0.15s' }} />
                  <span className="animate-bounce" style={{ width: 4, height: 4, borderRadius: '50%', background: '#534AB7', display: 'inline-block', animationDelay: '0.3s' }} />
                </div>
              </div>
              {/* Progress bar card */}
              <div style={{ width: '100%', background: '#fff', borderRadius: 9, border: '0.5px solid #ebebeb', padding: '7px 10px', marginTop: 8 }}>
                <p style={{ fontSize: 11, color: '#aaa', marginBottom: 3 }}>Vision API → Claude AI</p>
                <div style={{ background: '#f0f0f0', borderRadius: 3, height: 2, overflow: 'hidden' }}>
                  <div className="animate-pulse" style={{ height: 2, background: '#534AB7', borderRadius: 3, width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <style>{`
              @keyframes k33prShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            <div style={{ maxWidth: 520, margin: '0 auto', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5E3', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E3' }}>
                <div style={{ background: '#F8F8F6', borderRadius: 12, padding: '10px 14px', border: '1px solid #E5E5E3', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span style={{ fontSize: 14, color: '#1a1a1a' }}>{scanResult?.productName ?? 'Searching...'}</span>
                </div>
              </div>
              <div style={{ padding: '40px 32px 48px' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>Searching 5 engines</p>
                  <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Letting retailers fight it out for your money</p>
                </div>
                <div style={{ height: 4, background: '#F8F8F6', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, #534AB7, #7B73D4, #534AB7)', backgroundSize: '200% 100%', borderRadius: 2, animation: 'k33prShimmer 1.5s infinite' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(['Google Shopping', 'Amazon', 'Walmart', 'Bing Shopping', 'Best Buy'] as const).map((engine) => (
                    <div key={engine} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E5E5E3' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="4" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeDasharray="8 17" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="0.8s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#1a1a1a', flex: 1 }}>{engine}</span>
                      <span style={{ fontSize: 12, color: '#534AB7' }}>searching...</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {scanState === 'disambiguation' && scanResult && (
        <div className="md:hidden">
          <p className="text-lg font-semibold text-center mb-4">Which product did you scan?</p>
          <div className="grid grid-cols-3 gap-3">
            {lensResults.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white border border-gray-200 hover:border-[#534AB7] transition cursor-pointer overflow-hidden"
                onClick={() => {
                  const cleaned = cleanLensTitle(item.title)
                  setScanState('result')
                  handleFindBestPrice({ ...scanResult, productName: cleaned, searchTerms: [cleaned] })
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full aspect-square object-contain bg-gray-50"
                />
                <p className="text-xs line-clamp-2 px-2 py-1.5">{cleanLensTitle(item.title)}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <button
              className="text-sm text-gray-500 underline"
              onClick={() => {
                setScanState('result')
                handleFindBestPrice(scanResult)
              }}
            >
              None of these →
            </button>
          </div>
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

      {scanState === 'result' && scanResult && !isResuming && (() => {
        const truncateDelivery = (text: string) => {
          const onIdx = text.indexOf(' on ')
          if (onIdx > 0) return text.slice(0, onIdx)
          return text.length > 45 ? text.slice(0, 45) + '…' : text
        }

        const detectMultiPack = (item: SerpResult): string | null => {
          const patterns = /\b(\d+[\-\s]?pack|\bpack of \d+|\bcase of \d+|\bset of \d+|\d+[\-\s]?count|\d+[\-\s]?ct\b|\bbulk\b|\bwholesale\b|\bmulti[\-\s]?pack|\bbox of \d+|\blot of \d+|\d+\s*x\s*\d+)/i
          const title = item.title ?? ''
          const ext = item.extensions?.join(' ') ?? ''
          const snippet = item.snippet ?? ''
          const combined = `${title} ${ext} ${snippet}`
          const match = combined.match(patterns)
          return match ? match[0] : null
        }

        const allPriced: { price: number; priceFormatted: string; domain: string; url: string; isShopping: boolean; item: ShoppingResult | SerpResult }[] = []

        if (storeState === 'done') {
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
        }

        const totalSearched = shoppingResults.length + displayedSerpResults.length
        const hasResults = allPriced.length > 0

        const selected = hasResults ? (allPriced[selectedPriceIdx] ?? allPriced[0]) : null
        const selectedSerpItem = selected && !selected.isShopping ? (selected.item as SerpResult) : null
        const selectedId = selectedSerpItem ? `${selectedSerpItem.engine}-${selectedSerpItem.url}` : null

        const selectedCardKey = selected ? (selectedId ?? `shopping-${selected.url}`) : ''
        const selectedCardData = selectedCardKey ? (bestCardByResultId[selectedCardKey] ?? null) : null
        const cardRate = selectedCardData?.rate ?? 0
        const cardSavings = selected ? selected.price * (cardRate / 100) : 0
        const netCost = selected ? selected.price - cardSavings : 0
        const netCostFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netCost)
        const cardSavingsFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cardSavings)

        const selectedAsin = selectedSerpItem ? extractAsinFromUrl(selectedSerpItem.url) : null
        const keepaData = selectedAsin ? (keepaDataByAsin[selectedAsin] ?? null) : null
        const ninetyDayLow = keepaData?.allTimeLow ?? null
        const vsLow = (ninetyDayLow !== null && selected) ? selected.price - ninetyDayLow : null

        const VISIBLE_COUNT = 3
        const visiblePrices = showAllPrices ? allPriced : allPriced.slice(0, VISIBLE_COUNT)
        const hiddenCount = allPriced.length - VISIBLE_COUNT

        // Desktop picks computation
        const picks = selectPicks(displayedSerpResults.filter(r => r.price !== null), bestCardByResultId)

        // Edge case 7: safePickIdx guard
        const safePickIdx = (desktopPickIdx === 2 && !picks?.premium) ? 1 : desktopPickIdx

        const selectedAsinForTiming = (() => {
          for (const item of allPriced) {
            if (!item.isShopping) {
              const serpItem = item.item as SerpResult
              if (serpItem.retailerDomain === 'amazon.com' || serpItem.engine === 'amazon') {
                const asin = extractAsinFromUrl(serpItem.url)
                if (asin && keepaDataByAsin[asin]) return asin
              }
            }
          }
          return null
        })()
        const timingKeepa = selectedAsinForTiming ? (keepaDataByAsin[selectedAsinForTiming] ?? null) : null
        const timingVerdict = timingKeepa ? getBuyTiming(timingKeepa.percentVsAvg90) : null

        // Desktop selected pick (use safePickIdx)
        const desktopSelectedResult = safePickIdx === 0 ? picks?.cheapest : safePickIdx === 1 ? picks?.pick : (picks?.premium ?? picks?.pick)
        const desktopSelectedId = desktopSelectedResult ? `${desktopSelectedResult.engine}-${desktopSelectedResult.url}` : null
        const desktopCardData = desktopSelectedId ? (bestCardByResultId[desktopSelectedId] ?? null) : null
        const desktopCardRate = desktopCardData?.rate ?? 0
        const desktopNetCost = desktopSelectedResult ? desktopSelectedResult.price! * (1 - desktopCardRate / 100) : 0
        const desktopRetailerName = desktopSelectedResult ? desktopSelectedResult.retailerDomain.replace(/\.\w+$/, '') : ''

        const safeMobilePickIdx = (mobilePickIdx === 2 && !picks?.premium) ? 1 : mobilePickIdx
        const mobileSelectedFromPick = picks !== null
          ? (safeMobilePickIdx === 0 ? picks.cheapest : safeMobilePickIdx === 1 ? picks.pick : (picks.premium ?? picks.pick))
          : null

        const mobileSelected = (!mobileManualSelect && mobileSelectedFromPick)
          ? { price: mobileSelectedFromPick.price!, priceFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mobileSelectedFromPick.price!), domain: mobileSelectedFromPick.retailerDomain, url: mobileSelectedFromPick.url, isShopping: false, item: mobileSelectedFromPick as SerpResult }
          : selected
        const mobileSelectedSerpItem = (!mobileManualSelect && mobileSelectedFromPick) ? mobileSelectedFromPick : selectedSerpItem
        const mobileSelectedId = mobileSelectedSerpItem ? `${mobileSelectedSerpItem.engine}-${mobileSelectedSerpItem.url}` : null
        const mobileCardKey = mobileSelectedId ?? ''
        const mobileCardData = mobileCardKey ? (bestCardByResultId[mobileCardKey] ?? null) : null
        const mobileCardRate = mobileCardData?.rate ?? 0
        const mobileCardSavings = mobileSelected ? mobileSelected.price * (mobileCardRate / 100) : 0
        const mobileNetCost = mobileSelected ? mobileSelected.price - mobileCardSavings : 0
        const mobileNetCostFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mobileNetCost)
        const mobileCardSavingsFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mobileCardSavings)

        return (
          <>
            {/* ═══ MOBILE LAYOUT ═══ */}
            <div className="md:hidden" style={{ height: 'calc(100vh - 56px - 16px)' }}>
              <div className="flex flex-col" style={{ height: '100%' }}>
                {/* ═══ PINNED SECTION ═══ */}
                <div className="flex-shrink-0 space-y-3">

                  {/* Product header row */}
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    </button>
                  </div>

                  {selectedSerpItem?.rating != null && (
                    <div className="flex items-center gap-1.5" style={{ marginTop: '-4px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF9F27" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#111' }}>{selectedSerpItem.rating}</span>
                      {selectedSerpItem.reviews != null && (
                        <span style={{ fontSize: '13px', color: '#aaa' }}>({selectedSerpItem.reviews.toLocaleString()} reviews)</span>
                      )}
                    </div>
                  )}

                  {/* Loading state */}
                  {storeState === 'loading' && (
                    <div style={{ background: '#fff', border: '0.5px solid #ebebeb', borderRadius: 11, overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '0.5px solid #f0f0f0' }}>
                        <p style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Searching retailers...</p>
                      </div>
                      {['Amazon', 'Walmart', 'eBay', 'Best Buy', 'Target'].map((name, i) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: i < 4 ? '0.5px solid #f5f5f5' : 'none', opacity: i < 2 ? 1 : i < 3 ? 0.6 : 0.35 }}>
                          <span style={{ fontSize: 13, color: i < 3 ? '#111' : '#aaa' }}>{name}</span>
                          {i < 2 ? (
                            <span style={{ fontSize: 13, color: '#534AB7', fontWeight: 500 }}>✓</span>
                          ) : i === 2 ? (
                            <span className="animate-pulse" style={{ fontSize: 13, color: '#534AB7' }}>···</span>
                          ) : (
                            <span style={{ fontSize: 13, color: '#ddd' }}>—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No results state */}
                  {storeState === 'done' && !hasResults && (
                    <p className="text-sm text-center text-foreground-secondary">
                      No matching products found{scanResult?.productName ? ` for ${scanResult.productName}` : ''}.
                    </p>
                  )}

                  {picks !== null && storeState === 'done' && (
                    <div style={{ display: 'flex', background: '#F0EEFF', borderRadius: '10px', padding: '3px', marginBottom: '8px' }}>
                      {[
                        { idx: 0, label: 'Cheapest' },
                        { idx: 1, label: 'Best overall' },
                        ...(picks.premium !== null ? [{ idx: 2, label: 'Premium' }] : []),
                      ].map(({ idx, label }) => {
                        const isActive = safeMobilePickIdx === idx
                        return (
                          <button
                            key={idx}
                            onClick={() => { setMobilePickIdx(idx); setMobileManualSelect(false) }}
                            style={{
                              flex: 1,
                              padding: '7px 4px',
                              fontSize: '11px',
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? '#FFFFFF' : '#534AB7',
                              backgroundColor: isActive ? '#534AB7' : 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              boxShadow: isActive ? '0 1px 3px rgba(83,74,183,0.25)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Hero card */}
                  {hasResults && mobileSelected && (
                    <>
                      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#ebebeb' }}>
                        <div style={{ padding: '14px 14px 10px' }}>
                          <div className="flex items-start justify-between" style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                              {(() => {
                                const heroThumb = mobileSelectedSerpItem?.thumbnail ?? (mobileSelected?.item && 'imageUrl' in mobileSelected.item ? (mobileSelected.item as ShoppingResult).imageUrl : null) ?? null
                                return heroThumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={heroThumb} alt="" style={{ width: 52, height: 52, borderRadius: '8px', background: '#F8F8F6', objectFit: 'contain', flexShrink: 0 }} />
                                ) : null
                              })()}
                              <div style={{ minWidth: 0 }}>
                                {mobileSelectedFromPick ? (
                                  <>
                                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#534AB7', backgroundColor: '#F0EEFF', borderRadius: 6, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, marginBottom: 4 }}>
                                      {mobileSelectedFromPick.label}
                                    </span>
                                    <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{mobileSelectedFromPick.reason}</p>
                                  </>
                                ) : null}
                                <p style={{ fontSize: '10px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  {selectedPriceIdx === 0 ? 'Best verified price' : 'Vendor price'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const shareData = {
                                  title: scanResult.productName ?? 'K33pr Price Check',
                                  text: `${scanResult.productName} — ${mobileSelected.priceFormatted} at ${cleanDomain(mobileSelected.domain)}`,
                                  url: window.location.href,
                                }
                                try {
                                  if (navigator.share) {
                                    await navigator.share(shareData)
                                  } else {
                                    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
                                  }
                                } catch {}
                              }}
                              className="flex-shrink-0"
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                            </button>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div className="flex items-baseline gap-2">
                              <p style={{ fontSize: '28px', fontWeight: 500, color: '#111', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>{mobileSelected.priceFormatted}</p>
                              {mobileSelectedSerpItem?.oldPrice != null && mobileSelectedSerpItem.oldPrice > mobileSelected.price && (
                                <span style={{ fontSize: '14px', color: '#bbb', textDecoration: 'line-through' }}>
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mobileSelectedSerpItem.oldPrice)}
                                </span>
                              )}
                            </div>
                            {(() => {
                              const selectedAsinInline = mobileSelectedSerpItem ? extractAsinFromUrl(mobileSelectedSerpItem.url) : null
                              const kdInline = selectedAsinInline ? keepaDataByAsin[selectedAsinInline] ?? null : null
                              const isKeepaLoadingInline = selectedAsinInline ? keepaLoadingAsins.has(selectedAsinInline) : false
                              if (selectedAsinInline && kdInline && !isKeepaLoadingInline) {
                                return (
                                  <button
                                    onClick={() => {
                                      if (showHeroChart) {
                                        setSelectedPriceIdx(0)
                                        setUserDismissedChart(true)
                                      }
                                      setShowHeroChart(prev => !prev)
                                    }}
                                    style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontSize: '19px', color: '#534AB7', fontWeight: 600 }}
                                  >
                                    {showHeroChart ? 'Hide chart' : 'Price history'}
                                  </button>
                                )
                              }
                              if (selectedAsinInline && isKeepaLoadingInline) {
                                return <span style={{ fontSize: '11px', color: '#aaa' }}>Loading...</span>
                              }
                              return null
                            })()}
                          </div>

                          {mobileSelectedSerpItem?.extensions && mobileSelectedSerpItem.extensions.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ backgroundColor: '#FAEEDA', color: '#854F0B', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px' }}>
                                {mobileSelectedSerpItem.extensions[0]}
                              </span>
                            </div>
                          )}

                          {(() => {
                            const pack = mobileSelectedSerpItem ? detectMultiPack(mobileSelectedSerpItem) : null
                            return pack ? (
                              <div style={{ marginTop: '4px', display: 'inline-block' }}>
                                <span style={{ backgroundColor: '#FCEBEB', color: '#791F1F', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px' }}>
                                  {pack}
                                </span>
                              </div>
                            ) : null
                          })()}

                          {mobileCardRate > 0 && (
                            <div>
                              <div className="flex items-center gap-1" style={{ marginTop: '4px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1D9E75' }}>{mobileNetCostFormatted} net</span>
                                <span style={{ fontSize: '9px', backgroundColor: '#E1F5EE', color: '#085041', borderRadius: '3px', padding: '1px 5px' }}>after card savings</span>
                              </div>
                              <div className="flex items-center justify-between" style={{ backgroundColor: '#f8f8f8', borderRadius: '6px', padding: '5px 8px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#888' }}>{mobileCardData!.cardName} ({mobileCardRate}%)</span>
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#1D9E75' }}>−{mobileCardSavingsFormatted}</span>
                              </div>
                            </div>
                          )}

                          {(() => {
                            const selectedAsinLocal = mobileSelectedSerpItem ? extractAsinFromUrl(mobileSelectedSerpItem.url) : null
                            const kdLocal = selectedAsinLocal ? keepaDataByAsin[selectedAsinLocal] ?? null : null

                            return (
                              <>
                                <div style={{ marginTop: mobileCardRate > 0 ? '0px' : '6px' }}>
                                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                                    {cleanDomain(mobileSelected.domain)}
                                    {mobileSelectedSerpItem?.seller && mobileSelectedSerpItem.seller !== cleanDomain(mobileSelected.domain) ? ` · ${mobileSelectedSerpItem.seller}` : ''}
                                  </p>
                                  {mobileSelectedSerpItem?.delivery && mobileSelectedSerpItem.delivery.length > 0 && (
                                    <div className="flex items-center gap-1" style={{ marginTop: '3px' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mobileSelectedSerpItem.delivery[0].toLowerCase().includes('free') ? '#1D9E75' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="15" height="11" rx="1"/><path d="M16 9h4l3 3v5h-7V9z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                      <span style={{ fontSize: '11px', color: mobileSelectedSerpItem.delivery[0].toLowerCase().includes('free') ? '#1D9E75' : '#aaa' }}>
                                        {truncateDelivery(mobileSelectedSerpItem.delivery[0])}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {showHeroChart && kdLocal && kdLocal.priceHistory90Days.length > 1 && (
                                  <div style={{ marginTop: '10px', marginBottom: '4px' }}>
                                    <ResponsiveContainer width="100%" height={100}>
                                      <LineChart
                                        data={kdLocal.priceHistory90Days.map(p => ({
                                          date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                          price: p.price,
                                        }))}
                                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                                      >
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
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>

                        {/* Stat bar */}
                        <div className="flex" style={{ borderTop: '0.5px solid #f0f0f0' }}>
                          <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                            <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>90-day low</p>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#111' }}>{ninetyDayLow !== null ? `$${ninetyDayLow.toFixed(2)}` : '—'}</p>
                          </div>
                          <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                            <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>vs low</p>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: vsLow !== null && vsLow > 0 ? '#D85A30' : '#1D9E75' }}>{vsLow !== null ? (vsLow > 0 ? `+$${vsLow.toFixed(2)}` : vsLow === 0 ? 'At low ✓' : `-$${Math.abs(vsLow).toFixed(2)}`) : '—'}</p>
                          </div>
                          <div className="flex-1" style={{ padding: '8px 6px', borderRight: '0.5px solid #f0f0f0' }}>
                            <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>searched</p>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#534AB7' }}>{totalSearched}</p>
                          </div>
                          <div className="flex-1" style={{ padding: '8px 6px' }}>
                            <p style={{ fontSize: '9px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>net cost</p>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D9E75' }}>{mobileCardRate > 0 ? mobileNetCostFormatted : mobileSelected.priceFormatted}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div>
                        {mobileSelectedSerpItem && mobileSelectedId && !trackedIds.has(mobileSelectedId) && (
                          <>
                            <button
                              onClick={() => handleTrack(mobileSelectedSerpItem, false)}
                              disabled={trackingInProgress.has(mobileSelectedId)}
                              className="w-full rounded-xl py-3 text-sm font-medium text-white"
                              style={{ backgroundColor: '#534AB7', marginBottom: '8px' }}
                            >
                              {trackingInProgress.has(mobileSelectedId) ? 'Adding...' : 'Track price'}
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { if (isAggressiveEligible(mobileSelectedSerpItem)) handleTrack(mobileSelectedSerpItem, true) }}
                                disabled={!isAggressiveEligible(mobileSelectedSerpItem) || trackingInProgress.has(mobileSelectedId)}
                                className="flex-1 rounded-xl py-3 text-sm text-center border disabled:opacity-40"
                                style={{ color: '#555', borderColor: '#e0e0e0' }}
                              >
                                Aggressively track
                              </button>
                              <a
                                href={mobileSelected.url}
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
                        {mobileSelectedId && trackedIds.has(mobileSelectedId) && (
                          <div className="text-center text-sm font-medium" style={{ color: '#1D9E75' }}>Tracked ✓</div>
                        )}
                        {mobileSelected.isShopping && (
                          <a
                            href={(mobileSelected.item as ShoppingResult).productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-xl py-3 text-sm font-medium text-white text-center no-underline"
                            style={{ backgroundColor: '#534AB7', marginBottom: '8px' }}
                          >
                            Buy ↗
                          </a>
                        )}
                      </div>
                    </>
                  )}

                  {/* Store error state */}
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

                {/* ═══ SCROLLABLE SECTION ═══ */}
                {hasResults && allPriced.length > 1 && (
                  <div className="flex-1 overflow-y-auto min-h-0" style={{ marginTop: '12px' }}>
                    <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: '#ebebeb' }}>
                      {visiblePrices.map((r, idx) => {
                        const isSelected = idx === selectedPriceIdx
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedPriceIdx(idx)
                              setMobileManualSelect(true)
                              setShowHeroChart(false)
                              const serpItem = !r.isShopping ? (r.item as SerpResult) : null
                              if (serpItem) {
                                const id = `${serpItem.engine}-${serpItem.url}`
                                if (!(id in bestCardByResultId) && !bestCardLoadingIds.has(id)) {
                                  handleBestCard(serpItem, id)
                                }
                              }
                            }}
                            className="flex items-start justify-between cursor-pointer"
                            style={{
                              padding: '12px 14px',
                              borderBottom: idx < visiblePrices.length - 1 || hiddenCount > 0 ? '0.5px solid #f5f5f5' : 'none',
                              backgroundColor: isSelected ? '#f4f3fe' : 'transparent',
                              borderLeft: isSelected ? '3px solid #534AB7' : '3px solid transparent',
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5" style={{ flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#111' : '#555' }}>{cleanDomain(r.domain)}</span>
                                {(() => {
                                  const rowPickLabel =
                                    picks !== null && picks.pick.url === r.url ? picks.pick.label
                                    : picks !== null && picks.cheapest.url === r.url ? picks.cheapest.label
                                    : picks !== null && picks.premium !== null && picks.premium.url === r.url ? picks.premium.label
                                    : null
                                  return rowPickLabel ? (
                                    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, color: '#534AB7', backgroundColor: '#F0EEFF', borderRadius: 6, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2 }}>
                                      {rowPickLabel}
                                    </span>
                                  ) : null
                                })()}
                              </div>
                              {(() => {
                                const serpItem = !r.isShopping ? (r.item as SerpResult) : null
                                return (
                                  <>
                                    {serpItem?.seller && serpItem.seller !== cleanDomain(r.domain) && (
                                      <p style={{ fontSize: '11px', color: '#aaa', margin: '1px 0 0' }}>{serpItem.seller}</p>
                                    )}
                                    <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
                                      {serpItem?.delivery && serpItem.delivery.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={serpItem.delivery[0].toLowerCase().includes('free') ? '#1D9E75' : '#aaa'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="15" height="11" rx="1"/><path d="M16 9h4l3 3v5h-7V9z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                          <span style={{ fontSize: '11px', color: serpItem.delivery[0].toLowerCase().includes('free') ? '#1D9E75' : '#aaa' }}>
                                            {truncateDelivery(serpItem.delivery[0])}
                                          </span>
                                        </div>
                                      )}
                                      {serpItem?.extensions && serpItem.extensions.length > 0 && (
                                        <span style={{ backgroundColor: '#FAEEDA', color: '#854F0B', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px' }}>
                                          {serpItem.extensions[0]}
                                        </span>
                                      )}
                                      {serpItem?.rating != null && (
                                        <div className="flex items-center gap-0.5">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#EF9F27" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                          <span style={{ fontSize: '11px', color: '#aaa' }}>{serpItem.rating}</span>
                                        </div>
                                      )}
                                      {(() => {
                                        const pack = serpItem ? detectMultiPack(serpItem) : null
                                        return pack ? (
                                          <span style={{ backgroundColor: '#FCEBEB', color: '#791F1F', fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px' }}>
                                            {pack}
                                          </span>
                                        ) : null
                                      })()}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span style={{ fontSize: '15px', fontWeight: 600, color: idx === 0 ? '#534AB7' : '#111' }}>
                                {r.priceFormatted}{idx === 0 ? ' ✓' : ''}
                              </span>
                              {(() => {
                                const serpItem = !r.isShopping ? (r.item as SerpResult) : null
                                return serpItem?.oldPrice != null && serpItem.oldPrice > r.price ? (
                                  <p style={{ fontSize: '11px', color: '#ccc', textDecoration: 'line-through', margin: '1px 0 0' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(serpItem.oldPrice)}
                                  </p>
                                ) : null
                              })()}
                            </div>
                          </div>
                        )
                      })}

                      {hiddenCount > 0 && !showAllPrices && (
                        <div
                          onClick={() => setShowAllPrices(true)}
                          className="flex items-center justify-between cursor-pointer"
                          style={{ padding: '12px 14px' }}
                        >
                          <span style={{ fontSize: '13px', color: '#aaa' }}>{hiddenCount} filtered</span>
                          <span style={{ fontSize: '13px', color: '#534AB7', fontWeight: 600 }}>Show</span>
                        </div>
                      )}
                    </div>

                    {/* Affiliate disclosure */}
                     <p className="text-xs text-center text-foreground-secondary" style={{ marginTop: '12px', paddingBottom: '20px' }}>
                       K33pr may earn a small commission when you make a purchase through links on this site. This does not affect the price you pay. Commissions help support the operation of K33pr.
                     </p>
                     <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', padding: '12px 16px 4px', lineHeight: 1.4 }}>
                       Prices may include affiliate links. K33pr earns a commission when you purchase through these links.
                     </p>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ DESKTOP LAYOUT ═══ */}
            <div className="hidden md:block" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 24px 32px' }}>

              {/* Edge case 2: No results at all */}
              {storeState === 'done' && allPriced.length === 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>No price results found. Try scanning again or adjusting your search.</p>
                  <button
                    onClick={handleReset}
                    style={{ background: '#FFFFFF', color: '#534AB7', fontSize: '14px', fontWeight: 600, borderRadius: '12px', padding: '10px 24px', cursor: 'pointer', border: '1.5px solid #534AB7' }}
                  >
                    Try Again
                  </button>
                </div>
              )}

              <div style={{ height: '24px' }} />

              {storeState === 'loading' && (
                <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E5E3', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5E3' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8F8F6', borderRadius: '12px', padding: '10px 14px', border: '1px solid #E5E5E3' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{scanResult?.productName ?? 'Searching...'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '40px 32px 48px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>Searching 5 engines</p>
                        <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', margin: 0 }}>Letting retailers fight it out for your money</p>
                      </div>
                      <div style={{ height: '4px', background: '#F8F8F6', borderRadius: '2px', marginBottom: '28px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '60%', background: '#534AB7', borderRadius: '2px' }} className="animate-pulse" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {['Google Shopping', 'Amazon', 'Walmart', 'Bing Shopping', 'Best Buy'].map((engine) => (
                          <div key={engine} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E5E5E3' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeDasharray="8 17" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
                            </div>
                            <span style={{ fontSize: '13px', color: '#1a1a1a', flex: 1 }}>{engine}</span>
                            <span style={{ fontSize: '12px', color: '#534AB7' }}>searching...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {storeState !== 'loading' && (storeState !== 'done' || allPriced.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <div ref={verdictStickyRef} style={{ position: 'sticky', top: 58, zIndex: 10, background: '#FFFFFF', paddingBottom: '16px' }}>
                  {/* 1. VERDICT STRIP CARD — skip when picks is null, show fallback */}
                  {picks === null && storeState === 'done' && allPriced.length > 0 && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#999' }}>{allPriced.length === 1 ? 'Only 1 result found' : 'Not enough results for comparison'}</p>
                    </div>
                  )}

                  {picks !== null && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '16px', padding: '28px' }}>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.06em', marginBottom: '16px' }}>
                        K33pr analysis · {scanResult?.productName} · {allPriced.length} results across {matchResult?.searchMetadata?.enginesSucceeded?.length ?? 0} engines
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: picks.premium !== null ? '1fr 1fr 1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        {/* Sub-card 0 — cheapest */}
                        {(() => {
                          const item = picks.cheapest
                          const isSelected = desktopPickIdx === 0
                          const itemCardId = `${item.engine}-${item.url}`
                          const itemCard = bestCardByResultId[itemCardId] ?? null
                          const itemCardRate = itemCard?.rate ?? 0
                          const itemNetCost = item.price! * (1 - itemCardRate / 100)
                          const itemThumb = item.thumbnail ?? null
                          return (
                            <div
                              onClick={() => setDesktopPickIdx(0)}
                              style={{
                                border: isSelected ? '2px solid #534AB7' : '1px solid #E5E5E3',
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                background: isSelected ? '#FDFCFE' : '#FFFFFF',
                                position: 'relative',
                              }}
                            >
                              {itemThumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={itemThumb} alt="" style={{ width: 40, height: 40, borderRadius: '6px', background: '#F8F8F6', objectFit: 'contain', marginBottom: '8px' }} />
                              )}
                              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#1D9E75', marginBottom: '4px' }}>Lowest net cost</p>
                              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>{item.retailerDomain.replace(/\.\w+$/, '')}</p>
                              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1D9E75', marginBottom: '4px' }}>{formatCurrency(itemNetCost)}</p>
                              <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.4 }}>
                                {item.oldPrice != null && <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>{formatCurrency(item.oldPrice)}</span>}
                                {itemCardRate > 0 && <span>{itemCardRate}% card · </span>}
                                {item.delivery?.[0] && <span>{item.delivery[0]} · </span>}
                                {item.rating != null && <span>★{item.rating}{item.reviews != null ? ` (${item.reviews.toLocaleString()})` : ''}</span>}
                              </p>
                              {(item.retailerDomain === 'amazon.com' || item.engine === 'amazon') && (
                                <span style={{ fontSize: '9px', background: '#FEF2F2', color: '#991B1B', padding: '1px 4px', borderRadius: '3px' }}>No cashback — Amazon policy</span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Sub-card 1 — pick */}
                        {(() => {
                          const item = picks.pick
                          const isSelected = desktopPickIdx === 1
                          const itemCardId = `${item.engine}-${item.url}`
                          const itemCard = bestCardByResultId[itemCardId] ?? null
                          const itemCardRate = itemCard?.rate ?? 0
                          const itemNetCost = item.price! * (1 - itemCardRate / 100)
                          const itemThumb = item.thumbnail ?? null
                          return (
                            <div
                              onClick={() => setDesktopPickIdx(1)}
                              style={{
                                border: isSelected ? '2px solid #534AB7' : '1px solid #E5E5E3',
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                background: isSelected ? '#FDFCFE' : '#FFFFFF',
                                position: 'relative',
                              }}
                            >
                              {itemThumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={itemThumb} alt="" style={{ width: 40, height: 40, borderRadius: '6px', background: '#F8F8F6', objectFit: 'contain', marginBottom: '8px' }} />
                              )}
                              <div style={{ position: 'absolute', top: '-9px', left: '16px', background: '#534AB7', color: '#FFFFFF', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}>K33pr pick</div>
                              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#534AB7', marginBottom: '4px' }}>Best overall</p>
                              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>{item.retailerDomain.replace(/\.\w+$/, '')}</p>
                              <p style={{ fontSize: '24px', fontWeight: 700, color: '#534AB7', marginBottom: '4px' }}>{formatCurrency(itemNetCost)}</p>
                              <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.4 }}>
                                {item.oldPrice != null && <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>{formatCurrency(item.oldPrice)}</span>}
                                {itemCardRate > 0 && <span>{itemCardRate}% card · </span>}
                                {item.delivery?.[0] && <span>{item.delivery[0]} · </span>}
                                {item.rating != null && <span>★{item.rating}{item.reviews != null ? ` (${item.reviews.toLocaleString()})` : ''}</span>}
                              </p>
                              {(item.retailerDomain === 'amazon.com' || item.engine === 'amazon') && (
                                <span style={{ fontSize: '9px', background: '#FEF2F2', color: '#991B1B', padding: '1px 4px', borderRadius: '3px' }}>No cashback — Amazon policy</span>
                              )}
                            </div>
                          )
                        })()}

                        {/* Sub-card 2 — premium */}
                        {picks.premium !== null && (() => {
                          const item = picks.premium!
                          const isSelected = desktopPickIdx === 2
                          const itemCardId = `${item.engine}-${item.url}`
                          const itemCard = bestCardByResultId[itemCardId] ?? null
                          const itemCardRate = itemCard?.rate ?? 0
                          const itemNetCost = item.price! * (1 - itemCardRate / 100)
                          const itemThumb = item.thumbnail ?? null
                          return (
                            <div
                              onClick={() => setDesktopPickIdx(2)}
                              style={{
                                border: isSelected ? '2px solid #534AB7' : '1px solid #E5E5E3',
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                background: isSelected ? '#FDFCFE' : '#FFFFFF',
                                position: 'relative',
                              }}
                            >
                              {itemThumb && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={itemThumb} alt="" style={{ width: 40, height: 40, borderRadius: '6px', background: '#F8F8F6', objectFit: 'contain', marginBottom: '8px' }} />
                              )}
                              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#999', marginBottom: '4px' }}>Premium</p>
                              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>{item.retailerDomain.replace(/\.\w+$/, '')}</p>
                              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>{formatCurrency(itemNetCost)}</p>
                              <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.4 }}>
                                {item.oldPrice != null && <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>{formatCurrency(item.oldPrice)}</span>}
                                {itemCardRate > 0 && <span>{itemCardRate}% card · </span>}
                                {item.delivery?.[0] && <span>{item.delivery[0]} · </span>}
                                {item.rating != null && <span>★{item.rating}{item.reviews != null ? ` (${item.reviews.toLocaleString()})` : ''}</span>}
                              </p>
                              {(item.retailerDomain === 'amazon.com' || item.engine === 'amazon') && (
                                <span style={{ fontSize: '9px', background: '#FEF2F2', color: '#991B1B', padding: '1px 4px', borderRadius: '3px' }}>No cashback — Amazon policy</span>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Reason bar */}
                      <div style={{ background: '#F8F8F6', borderRadius: '10px', padding: '14px 20px', fontSize: '13px', color: '#555', lineHeight: 1.6 }}>
                        <span>{safePickIdx === 0 ? picks.cheapest.reason : safePickIdx === 1 ? picks.pick.reason : (picks.premium?.reason ?? picks.pick.reason)}</span>
                        {timingVerdict !== null && timingKeepa !== null && timingKeepa.percentVsAvg90 !== null && (
                          <span>{' '}Price is {Math.abs(timingKeepa.percentVsAvg90).toFixed(1)}% {timingKeepa.percentVsAvg90 < 0 ? 'below' : 'above'} the 90-day average, so timing is {timingVerdict === 'good' ? 'good' : timingVerdict === 'fair' ? 'fair' : 'worth watching'} regardless of which you choose.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. ACTION BUTTONS ROW */}
                  {picks !== null && desktopSelectedResult && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => window.open(desktopSelectedResult.url, '_blank')}
                        style={{ flex: 1, background: '#534AB7', color: '#FFFFFF', fontSize: '14px', fontWeight: 600, borderRadius: '12px', padding: '14px', cursor: 'pointer', border: 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#473FA0' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#534AB7' }}
                      >
                        Buy at {desktopRetailerName} — {formatCurrency(desktopNetCost)} net ↗
                      </button>
                      <button
                        style={{ flex: 1, background: '#FFFFFF', color: '#534AB7', fontSize: '14px', fontWeight: 600, borderRadius: '12px', padding: '14px', cursor: 'pointer', border: '1.5px solid #534AB7' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F8F7FE' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
                      >
                        Track for lower
                      </button>
                    </div>
                  )}

                  {/* 3. EXPANDABLE COMMAND CENTER TABLE */}
                  <div
                    onClick={() => setDesktopTableExpanded(prev => !prev)}
                    style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #E5E5E3', background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '16px 16px 0 0', marginTop: '16px' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>All {allPriced.length} results — full comparison</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#534AB7' }}>{desktopTableExpanded ? 'Collapse' : 'Expand'}</span>
                  </div>
                  </div>

                  <div style={{ background: '#FFFFFF', borderRadius: '0 0 16px 16px', border: '1px solid #E5E5E3', borderTop: 'none', padding: 0, marginTop: '-16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 58 + verdictHeight, zIndex: 9, background: '#FAFAF8' }}>
                        <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E5E5E3' }}>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Retailer / product</th>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Price</th>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Card</th>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Net cost</th>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Rating</th>
                          <th style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', fontWeight: 600, letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Ship</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(desktopTableExpanded ? allPriced : allPriced.slice(0, 7)).map((item, idx) => {
                          const isSerpItem = !item.isShopping
                          const serpItem = isSerpItem ? (item.item as SerpResult) : null
                          const rowId = serpItem ? `${serpItem.engine}-${serpItem.url}` : `shopping-${item.url}`
                          const rowCardData = bestCardByResultId[rowId] ?? null
                          const rowCardRate = rowCardData?.rate ?? 0
                          const rowNetCost = item.price * (1 - rowCardRate / 100)
                          const isPick = picks !== null && serpItem !== null && serpItem.engine === picks.pick.engine && serpItem.url === picks.pick.url
                          const isCheapest = idx === 0
                          const thumbnail = serpItem?.thumbnail ?? (item.item as ShoppingResult)?.imageUrl ?? null

                          return (
                            <tr
                              key={rowId + idx}
                              onClick={() => setDesktopPickIdx(
                                picks !== null && serpItem !== null && serpItem.engine === picks.cheapest.engine && serpItem.url === picks.cheapest.url ? 0
                                  : picks !== null && serpItem !== null && serpItem.engine === picks.pick.engine && serpItem.url === picks.pick.url ? 1
                                  : 2
                              )}
                              style={{
                                borderBottom: '1px solid #F2F2F0',
                                cursor: 'pointer',
                                background: isPick ? '#F8F7FE' : '#FFFFFF',
                                boxShadow: isPick ? 'inset 3px 0 0 #534AB7' : 'none',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!isPick) (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAF8' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isPick ? '#F8F7FE' : '#FFFFFF' }}
                            >
                              <td style={{ padding: '10px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                                  {thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={thumbnail} alt="" style={{ width: 36, height: 36, borderRadius: '6px', background: '#F8F8F6', objectFit: 'contain', flexShrink: 0 }} />
                                  ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: '6px', background: '#F8F8F6', flexShrink: 0 }} />
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{serpItem ? cleanDomain(serpItem.retailerDomain ?? '') : cleanDomain(item.domain)}</span>
                                      {isPick && (
                                        <span style={{ fontSize: '9px', fontWeight: 700, background: '#EEEDFE', color: '#534AB7', padding: '1px 6px', borderRadius: '3px', marginLeft: '4px' }}>K33PR PICK</span>
                                      )}
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px', margin: '1px 0 0' }}>
                                      {serpItem?.title ?? (item.item as ShoppingResult)?.title ?? ''}
                                    </p>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                      {serpItem?.extensions?.slice(0, 2).map((ext, ei) => (
                                        <span key={ei} style={{ fontSize: '9px', background: '#FAEEDA', color: '#854F0B', padding: '1px 4px', borderRadius: '3px' }}>{ext}</span>
                                      ))}
                                      {serpItem?.in_stock === true && (
                                        <span style={{ fontSize: '9px', background: '#E1F5EE', color: '#085041', padding: '1px 4px', borderRadius: '3px' }}>In stock</span>
                                      )}
                                      {(serpItem?.retailerDomain === 'amazon.com' || serpItem?.engine === 'amazon') && (
                                        <span style={{ fontSize: '9px', background: '#FEF2F2', color: '#991B1B', padding: '1px 4px', borderRadius: '3px' }}>No cashback — Amazon policy</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: isCheapest ? '#534AB7' : '#1a1a1a' }}>{item.priceFormatted}</span>
                                {serpItem?.oldPrice != null && serpItem.oldPrice > item.price && (
                                  <p style={{ fontSize: '10px', color: '#ccc', textDecoration: 'line-through', margin: '1px 0 0' }}>{formatCurrency(serpItem.oldPrice)}</p>
                                )}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                                {rowCardData ? (
                                  <div>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: rowCardRate >= 5 ? '#1D9E75' : '#1a1a1a' }}>{rowCardRate}%</span>
                                    <p style={{ fontSize: '9px', color: '#999', margin: '1px 0 0' }}>{rowCardData.cardName}</p>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#ddd' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D9E75' }}>{formatCurrency(rowNetCost)}</span>
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {serpItem?.rating != null ? (
                                  <span style={{ fontSize: '11px', color: '#999' }}>
                                    <span style={{ color: '#EF9F27' }}>★</span>{serpItem.rating}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#ddd' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {serpItem?.delivery?.[0] ? (
                                  <span style={{ fontSize: '11px', color: serpItem.delivery[0].toLowerCase().includes('free') ? '#1D9E75' : '#999', fontWeight: serpItem.delivery[0].toLowerCase().includes('free') ? 500 : 400 }}>
                                    {serpItem.delivery[0].toLowerCase().includes('free') ? 'Free' : serpItem.delivery[0]}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#ddd' }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {!desktopTableExpanded && allPriced.length > 7 && (
                      <div
                        onClick={() => setDesktopTableExpanded(true)}
                        style={{ padding: '10px 20px', textAlign: 'center', borderTop: '1px solid #F2F2F0', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#534AB7' }}>Show {allPriced.length - 7} more</span>
                      </div>
                    )}
                  </div>

                  {/* 4. AFFILIATE DISCLOSURE */}
                  <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', marginTop: '8px' }}>
                    K33pr may earn a commission when you purchase through links. This does not affect the price you pay.
                  </p>
                  <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', padding: '12px 0 4px', lineHeight: 1.4 }}>
                    Prices may include affiliate links. K33pr earns a commission when you purchase through these links.
                  </p>
                </div>

                {/* RIGHT COLUMN (sidebar) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: 58, maxHeight: 'calc(100vh - 74px)', overflowY: 'auto' }}>

                  {/* 1. BUY TIMING CARD */}
                  {timingVerdict !== null && timingKeepa !== null && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '14px', padding: '16px' }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.06em', marginBottom: '8px' }}>Buy timing</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: getBuyTimingColor(timingVerdict), marginBottom: '4px' }}>{getBuyTimingLabel(timingVerdict)}</p>
                      <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.5, marginBottom: '10px' }}>
                        {timingKeepa.percentVsAvg90 !== null && `${Math.abs(timingKeepa.percentVsAvg90).toFixed(1)}% ${timingKeepa.percentVsAvg90 < 0 ? 'below' : 'above'} 90-day average.`}
                      </p>
                      {timingKeepa.priceHistory90Days.length > 1 && (
                        <ResponsiveContainer width="100%" height={100}>
                          <LineChart data={timingKeepa.priceHistory90Days.map(p => ({ date: p.timestamp, price: p.price }))}>
                            <Line type="monotone" dataKey="price" stroke="#534AB7" strokeWidth={2} dot={false} />
                            <XAxis dataKey="date" hide={true} />
                            <YAxis hide={true} />
                            <Tooltip formatter={(value) => {
                              const num = typeof value === 'number' ? value : Number(value)
                              return [formatCurrency(num), 'Price']
                            }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '10px' }}>
                        <div style={{ flex: 1, background: '#F8F8F6', borderRadius: '8px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>All-time low</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75', marginTop: '1px' }}>{timingKeepa.allTimeLow !== null ? formatCurrency(timingKeepa.allTimeLow) : '—'}</p>
                        </div>
                        <div style={{ flex: 1, background: '#F8F8F6', borderRadius: '8px', padding: '8px 10px' }}>
                          <p style={{ fontSize: '10px', color: '#999', margin: 0 }}>90d average</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '1px' }}>{timingKeepa.avg90 !== null ? formatCurrency(timingKeepa.avg90) : '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. BEST CARD CARD */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '14px', padding: '16px' }}>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.06em', marginBottom: '8px' }}>Best card for this purchase</p>
                    {desktopCardData ? (
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>{desktopCardData.cardName}</p>
                        <p style={{ fontSize: '12px', color: '#999', marginTop: '3px' }}>
                          {desktopCardData.rate}% · saves {desktopSelectedResult ? formatCurrency(desktopSelectedResult.price! * (desktopCardData.rate / 100)) : '—'}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#777' }}>
                        Add your cards in{' '}
                        <span
                          style={{ color: '#534AB7', cursor: 'pointer' }}
                          onClick={() => router.push('/settings')}
                        >
                          Settings
                        </span>
                        {' '}for cashback recommendations
                      </p>
                    )}
                  </div>

                  {/* 3. SAVINGS MATH CARD */}
                  {desktopSelectedResult && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '14px', padding: '16px' }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.06em', marginBottom: '8px' }}>Savings breakdown</p>
                      {(() => {
                        const highestPrice = allPriced.length > 0 ? Math.max(...allPriced.map(p => p.price)) : desktopSelectedResult.price!
                        const vsRetail = highestPrice - desktopSelectedResult.price!
                        const cardSavingsAmt = desktopSelectedResult.price! * (desktopCardRate / 100)
                        const vsAvg = (timingKeepa !== null && timingKeepa.avg90 != null) ? timingKeepa.avg90 - desktopSelectedResult.price! : null

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                              <span style={{ color: '#555' }}>vs typical retail ({formatCurrency(highestPrice)})</span>
                              <span style={{ color: '#1D9E75' }}>−{formatCurrency(vsRetail)}</span>
                            </div>
                            {desktopCardData && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                <span style={{ color: '#555' }}>Card cashback ({desktopCardRate}%)</span>
                                <span style={{ color: '#1D9E75' }}>−{formatCurrency(cardSavingsAmt)}</span>
                              </div>
                            )}
                            {vsAvg !== null && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                                <span style={{ color: '#555' }}>vs 90-day average</span>
                                <span style={{ color: vsAvg >= 0 ? '#1D9E75' : '#D85A30' }}>{vsAvg >= 0 ? '−' : '+'}{formatCurrency(Math.abs(vsAvg))}</span>
                              </div>
                            )}
                            <div style={{ borderTop: '1px solid #E5E5E3', marginTop: '6px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>You pay</span>
                              <span style={{ fontSize: '22px', fontWeight: 700, color: '#1D9E75' }}>{formatCurrency(desktopNetCost)}</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* 4. ENGINES CARD */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E3', borderRadius: '14px', padding: '16px' }}>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.06em', marginBottom: '8px' }}>Search engines</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(matchResult?.searchMetadata?.enginesQueried ?? []).map(engine => {
                        const succeeded = (matchResult?.searchMetadata?.enginesSucceeded ?? []).includes(engine)
                        return (
                          <span
                            key={engine}
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '3px',
                              fontWeight: 500,
                              background: succeeded ? '#E1F5EE' : '#F8F8F6',
                              color: succeeded ? '#085041' : '#bbb',
                            }}
                          >
                            {engine}{succeeded ? ' ✓' : ' (error)'}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
