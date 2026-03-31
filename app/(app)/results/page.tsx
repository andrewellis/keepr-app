'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { AffiliateResult } from '@/lib/affiliates/types'
import ResultSkeleton from '@/components/ResultSkeleton'

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

  // Derive cashback rate for display
  const cashbackRate = cashbackRateParam ? Number(cashbackRateParam) : 0.05
  const cashbackPct = Math.round(cashbackRate * 100)

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

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-36">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
          {results.length > 1 ? 'Comparing prices for' : 'Results for'}
        </p>
        <h1 className="text-2xl font-bold text-white capitalize">{productName || 'Product'}</h1>
        {category && category !== 'General' && (
          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{category}</p>
        )}
      </div>

      {/* Loading */}
      {fetchState === 'loading' && <ResultSkeleton />}

      {/* Error */}
      {fetchState === 'error' && (
        <div className="space-y-4">
          <div className="bg-surface border border-red-800/50 rounded-2xl p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <p className="text-sm" style={{ color: '#9ca3af' }}>
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
          {results.map((p, i) => {
            const netCostCents = p.price - p.totalReturnCents
            const isOutOfStock = !p.inStock
            const isBestDeal = i === 0 && results.length > 1

            return (
              <div
                key={p.affiliateUrl}
                className={`bg-surface border rounded-2xl p-4 space-y-3 relative ${
                  isOutOfStock ? 'border-border opacity-60' : 'border-border'
                }`}
              >
                {/* Best Deal badge */}
                {isBestDeal && (
                  <span
                    className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                    style={{ backgroundColor: '#FF6B35', color: '#fff' }}
                  >
                    Best Deal
                  </span>
                )}

                {/* Retailer + Product info */}
                <div className="pr-20">
                  <p className="text-base font-bold text-white">{p.retailer}</p>
                  <p className="text-sm text-foreground-secondary leading-snug mt-0.5">
                    {p.productName}
                  </p>
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

                {/* Price + earnings breakdown */}
                <div className="space-y-1.5">
                  <p className="text-2xl font-bold text-white">{fmtPrice(p.price)}</p>

                  <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                    You earn: {fmt(p.userPayoutCents)}
                  </p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Est. cashback: {fmt(p.estimatedCashbackCents)}
                  </p>
                  <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
                    Total back: {fmt(p.totalReturnCents)}
                  </p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Net cost: {fmt(Math.max(0, netCostCents))}
                  </p>
                </div>

                {/* Buy button */}
                {isOutOfStock ? (
                  <button
                    disabled
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white/50 bg-gray-700 cursor-not-allowed"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(p)}
                    className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
                    style={{ backgroundColor: '#FF6B35' }}
                  >
                    {buyStates[p.affiliateUrl] === 'opening'
                      ? 'Opening...'
                      : `Buy at ${p.retailer}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cashback rate note */}
      {fetchState === 'done' && results.length > 0 && !hasCustomRate && (
        <div className="bg-surface border border-border rounded-2xl p-4 mt-4">
          <p className="text-xs" style={{ color: '#9ca3af' }}>
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
        <p className="text-xs text-center mt-4" style={{ color: '#6b7280' }}>
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
