'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { AffiliateResult } from '@/lib/affiliates/types'
import ResultSkeleton from '@/components/ResultSkeleton'
import { getUserCardsWithRates } from '@/lib/cards/actions'
import { getCardCategory } from '@/lib/cards/categoryMap'
import { getBestCardRecommendation } from '@/lib/cards/recommender'
import type { CardRecommendation } from '@/lib/cards/recommender'
import { createClient } from '@/lib/supabase/client'

type FetchState = 'loading' | 'done' | 'error'
type BuyState = 'idle' | 'opening'

function fmt(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

function fmtPrice(priceCents: number) {
  return '$' + (priceCents / 100).toFixed(2)
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background px-5 pt-12 pb-36"><ResultSkeleton /></div>}>
      <ResultsContent />
    </Suspense>
  )
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const productName = searchParams.get('productName') ?? ''
  const category = searchParams.get('category') ?? 'General'
  const searchTermsRaw = searchParams.get('searchTerms') ?? ''
  const cashbackRateParam = searchParams.get('cashbackRate')

  const [fetchState, setFetchState] = useState<FetchState>('loading')
  const [results, setResults] = useState<AffiliateResult[]>([])
  const [buyStates, setBuyStates] = useState<Record<string, BuyState>>({})
  const [hasCustomRate, setHasCustomRate] = useState(true)
  const [scannedImage, setScannedImage] = useState<string | null>(null)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  // Card recommendation state
  // null = not yet resolved, undefined = no recommendation (no cards / not logged in)
  const [cardRecommendation, setCardRecommendation] = useState<CardRecommendation | null | undefined>(null)
  const [userLoggedIn, setUserLoggedIn] = useState<boolean | null>(null)

  // Derive cashback rate for display
  const cashbackRate = cashbackRateParam ? Number(cashbackRateParam) : 0.05
  const cashbackPct = Math.round(cashbackRate * 100)

  // Load scanned image from sessionStorage on mount
  useEffect(() => {
    const img = sessionStorage.getItem('k33pr_scanned_image')
    if (img) setScannedImage(img)
  }, [])

  // Fetch card recommendation after results are loaded
  useEffect(() => {
    if (fetchState !== 'done' || results.length === 0) return

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
        console.log('[card-rec] getUserCardsWithRates result:', userCards)

        if (!userCards || userCards.length === 0) {
          setCardRecommendation(undefined)
          return
        }

        const cardCategory = getCardCategory(category)
        const recommendation = getBestCardRecommendation(userCards, cardCategory)
        console.log('[card-rec] getBestCardRecommendation result:', recommendation)
        setCardRecommendation(recommendation ?? undefined)
      } catch {
        // Silently fail — don't show the block if data isn't available
        setCardRecommendation(undefined)
      }
    }

    fetchCardRecommendation()
  }, [fetchState, results.length, category])

  // Clean up sessionStorage on unmount
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('k33pr_scanned_image')
    }
  }, [])

  useEffect(() => {
    if (!productName) {
      setFetchState('error')
      return
    }

    // Determine if user has a custom cashback rate set
    if (!cashbackRateParam) {
      setHasCustomRate(false)
    }

    const searchTerms = searchTermsRaw
      ? searchTermsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [productName]

    async function fetchResults() {
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productName, category, searchTerms }),
        })
        if (!res.ok) throw new Error('fetch error')
        const data = await res.json()
        setResults(data.results ?? [])
        setFetchState('done')
      } catch {
        setFetchState('error')
      }
    }

    fetchResults()
  }, [productName, category, searchTermsRaw, cashbackRateParam])

  function handleBuy(p: AffiliateResult) {
    window.open(p.affiliateUrl, '_blank', 'noopener,noreferrer')
    setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'opening' }))
    setTimeout(() => {
      setBuyStates((prev) => ({ ...prev, [p.affiliateUrl]: 'idle' }))
    }, 1500)

    // Log transaction
    const sessionToken =
      typeof window !== 'undefined' ? localStorage.getItem('keepr_anon_id') : null
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

  /** Whether this result has a known price (not a search link) */
  function hasPrice(p: AffiliateResult) {
    return p.price > 0
  }

  /** Determine the button label based on retailer */
  function buyButtonLabel(p: AffiliateResult) {
    if (p.retailer === 'Amazon') return 'Search on Amazon'
    return `Search on ${p.retailer.replace(/ \(.*\)$/, '')}`
  }

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-36">
      {/* Product summary card with scanned image */}
      <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          {scannedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scannedImage}
              alt={productName || 'Scanned product'}
              className="w-[120px] h-[120px] rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground capitalize leading-snug">
              {productName || 'Product'}
            </h1>
            {category && category !== 'General' && (
              <p className="text-sm mt-1 text-foreground-secondary">{category}</p>
            )}
            <p className="text-xs text-foreground-secondary mt-2">Identified by K33pr</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {fetchState === 'loading' && <ResultSkeleton />}

      {/* Error */}
      {fetchState === 'error' && (
        <div className="space-y-4">
          <div className="bg-surface border border-red-200 rounded-2xl p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-foreground font-semibold text-sm">
              {productName
                ? `Couldn't load results for "${productName}".`
                : 'No product specified.'}
            </p>
            <Link
              href="/scan"
              className="text-sm text-primary font-medium hover:opacity-80 transition inline-block"
            >
              Go back to Scan
            </Link>
          </div>
        </div>
      )}

      {/* No results */}
      {fetchState === 'done' && results.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
          <p className="text-sm text-foreground-secondary">
            No results found. Try scanning again.
          </p>
          <Link
            href="/scan"
            className="inline-block bg-primary text-white rounded-xl px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
          >
            Scan Another
          </Link>
        </div>
      )}

      {/* Results list */}
      {fetchState === 'done' && results.length > 0 && (
        <div className="space-y-3">
          {results.map((p) => {
            const priceKnown = hasPrice(p)
            const netCostCents = p.price - p.totalReturnCents
            const isOutOfStock = !p.inStock
            const affiliateRatePct = Math.round(p.affiliateRate * 100)

            return (
              <div
                key={p.affiliateUrl}
                className={`bg-surface border rounded-2xl p-4 space-y-3 relative ${
                  isOutOfStock ? 'border-border opacity-60' : 'border-border'
                }`}
              >
                {/* Retailer + Product info */}
                <div>
                  <p className="text-base font-bold text-foreground">{p.retailer}</p>
                  <p className="text-sm text-foreground-secondary leading-snug mt-0.5">
                    {p.productName}
                  </p>
                </div>

                {/* Commission rate display */}
                <div className="space-y-0.5">
                  <p className="text-xs text-foreground-secondary">
                    Earn up to {affiliateRatePct}% cashback through K33pr
                  </p>
                  {hasCustomRate ? (
                    <p className="text-xs text-foreground-secondary">
                      + your {cashbackPct}% card cashback
                    </p>
                  ) : (
                    <p className="text-xs text-foreground-secondary">
                      + estimated {cashbackPct}% card cashback{' '}
                      <Link href="/settings" className="text-primary hover:underline">
                        (update your rate in Settings)
                      </Link>
                    </p>
                  )}
                </div>

                {/* Image row if available */}
                {p.imageUrl && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.productName}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  </div>
                )}

                {/* Price + earnings breakdown — only when price is known */}
                {priceKnown && (
                  <div className="space-y-1.5">
                    <p className="text-2xl font-bold text-foreground">{fmtPrice(p.price)}</p>

                    <p className="text-sm font-semibold text-primary">
                      You earn: {fmt(p.userPayoutCents)}
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      Est. cashback: {fmt(p.estimatedCashbackCents)}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      Total back: {fmt(p.totalReturnCents)}
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      Net cost: {fmt(Math.max(0, netCostCents))}
                    </p>
                  </div>
                )}

                {/* Buy / Search button */}
                {isOutOfStock ? (
                  <button
                    disabled
                    className="w-full rounded-xl py-3 text-sm font-semibold text-foreground-secondary bg-border cursor-not-allowed"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleBuy(p)}
                      className="w-full bg-primary rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
                    >
                      {buyStates[p.affiliateUrl] === 'opening'
                        ? 'Opening...'
                        : buyButtonLabel(p)}
                    </button>
                    {!priceKnown && (
                      <p className="text-xs text-center text-foreground-secondary">
                        Find this product on {p.retailer.replace(/ \(.*\)$/, '')}. Your purchase earns cashback through K33pr.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Card recommendation block */}
      {fetchState === 'done' && results.length > 0 && cardRecommendation !== null && (
        <>
          {/* No cards / not logged in: subtle prompt */}
          {(userLoggedIn === false || cardRecommendation === undefined) && (
            <p className="text-xs text-foreground-secondary mt-4">
              <Link href="/settings" className="text-primary hover:underline">
                Add your cards in Settings
              </Link>{' '}
              to see combined cashback recommendations.
            </p>
          )}

          {/* Card recommendation */}
          {cardRecommendation && (
            <div className="bg-surface border border-border rounded-2xl p-4 mt-4 space-y-2">
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
              {results.length > 0 && (() => {
                const topResult = results[0]
                const k33prRatePct = Math.round(topResult.affiliateRate * 100)
                const cardRatePct = cardRecommendation.rate
                const totalPct = k33prRatePct + cardRatePct
                return (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-foreground-secondary">
                      K33pr cashback + {cardRecommendation.cardName}:{' '}
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

      {/* How cashback works — expandable section */}
      {fetchState === 'done' && results.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition"
          >
            <span>How does cashback work?</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${howItWorksOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {howItWorksOpen && (
            <div className="bg-surface border border-border rounded-2xl p-4 mt-2 space-y-3">
              <p className="text-sm text-foreground-secondary leading-relaxed">
                When you buy through a K33pr link, the retailer pays us a commission. We keep $0.20
                and send the rest to you via PayPal or Venmo. Commission rates vary by retailer and
                product category — the percentages shown above are typical rates.
              </p>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Your total savings = K33pr cashback + your credit card&apos;s cashback rate.
              </p>
              <Link
                href="/how-it-works"
                className="text-sm text-primary font-medium hover:underline transition inline-block"
              >
                Learn more →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Cashback rate note — only show when prices are known */}
      {fetchState === 'done' && results.length > 0 && !hasCustomRate && results.some((r) => r.price > 0) && (
        <div className="bg-surface border border-border rounded-2xl p-4 mt-4">
          <p className="text-xs text-foreground-secondary">
            Cashback estimate based on {cashbackPct}% card rate.{' '}
            <Link href="/settings" className="text-primary hover:underline">
              Update your rate in Settings
            </Link>{' '}
            for accuracy.
          </p>
        </div>
      )}

      {/* Affiliate disclosure */}
      {fetchState === 'done' && results.length > 0 && (
        <p className="text-xs text-center mt-4 text-foreground-secondary">
          As an Amazon Associate, GRMtek LLC earns from qualifying purchases.
        </p>
      )}

      {/* Fixed Scan Another button */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-5 pb-3 pt-2 bg-background/95 backdrop-blur-sm border-t border-border">
        <Link
          href="/scan"
          className="block w-full bg-surface border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground text-center hover:border-primary transition"
        >
          Scan Another
        </Link>
      </div>
    </div>
  )
}
