'use client';

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

type TrackedItem = {
  id: string
  title: string
  category: string | null
  search_query: string | null
  aggressive: boolean
  min_observed_price: number | null
  created_at: string
  last_checked_at: string | null
  asin: string | null
}

type PriceCheck = {
  tracked_item_id: string
  price: number
  retailer_domain: string | null
  checked_at: string
}

type ChartPoint = {
  date: string
  price: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
}

function cleanDomain(domain: string): string {
  if (
    domain.includes('google.shopping') ||
    domain.includes('google_shopping') ||
    domain.startsWith('google.')
  ) {
    return 'Google Shopping'
  }
  let d = domain.replace(/^www\./, '')
  d = d.replace(/\.(com|co\.uk|org|net|co)$/, '')
  return d.charAt(0).toUpperCase() + d.slice(1)
}

// Custom tooltip for the chart
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-foreground-secondary mb-0.5">{label}</p>
      <p className="text-foreground font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export default function TrackingPage() {
  const router = useRouter()
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([])
  const [latestChecks, setLatestChecks] = useState<Map<string, PriceCheck>>(new Map())
  const [loading, setLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Chart state
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)

  const fetchChartData = useCallback(async (item: TrackedItem) => {
    setChartLoading(true)
    setChartData([])

    try {
      if (item.asin) {
        // Fetch from Keepa
        const res = await fetch(`/api/keepa/product?asin=${encodeURIComponent(item.asin)}`)
        if (res.ok) {
          const data = await res.json()
          const history: { price: number; timestamp: number }[] = (data.data ?? data).priceHistory90Days ?? []
          const mapped = history.map((entry) => ({
            date: new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: entry.price,
          }))
          if (mapped.length > 0) {
            setChartData(mapped)
            setChartLoading(false)
            return
          }
        }
      }

      // Fallback: query price_checks from Supabase
      const supabase = createClient()
      const { data: checks } = await supabase
        .from('price_checks')
        .select('price, checked_at')
        .eq('tracked_item_id', item.id)
        .order('checked_at', { ascending: true })

      if (checks && checks.length > 0) {
        const points: ChartPoint[] = checks.map((c) => ({
          date: new Date(c.checked_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          price: c.price,
        }))
        setChartData(points)
      } else {
        setChartData([])
      }
    } catch {
      setChartData([])
    }

    setChartLoading(false)
  }, [])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: items } = await supabase
        .from('tracked_items')
        .select('id, title, category, search_query, aggressive, min_observed_price, created_at, last_checked_at, asin')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      const fetchedItems: TrackedItem[] = items ?? []
      setTrackedItems(fetchedItems)

      if (fetchedItems.length > 0) {
        const { data: checks } = await supabase
          .from('price_checks')
          .select('tracked_item_id, price, retailer_domain, checked_at')
          .in('tracked_item_id', fetchedItems.map((i) => i.id))
          .order('checked_at', { ascending: false })

        const checkMap = new Map<string, PriceCheck>()
        for (const check of checks ?? []) {
          if (!checkMap.has(check.tracked_item_id)) {
            checkMap.set(check.tracked_item_id, check as PriceCheck)
          }
        }
        setLatestChecks(checkMap)

        // Auto-select first item
        const first = fetchedItems[0]
        setSelectedItem(first)
        fetchChartData(first)
      }

      setLoading(false)
    }

    fetchData()
  }, [fetchChartData])

  function handleSelectItem(item: TrackedItem) {
    setSelectedItem(item)
    fetchChartData(item)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleStopTracking(itemId: string) {
    if (deletingIds.has(itemId)) return
    setDeletingIds(prev => new Set(prev).add(itemId))

    const supabase = createClient()
    const { error } = await supabase
      .from('tracked_items')
      .update({ is_active: false })
      .eq('id', itemId)

    if (!error) {
      setTrackedItems(prev => {
        const next = prev.filter(i => i.id !== itemId)
        // If we deleted the selected item, select the next one
        if (selectedItem?.id === itemId) {
          if (next.length > 0) {
            setSelectedItem(next[0])
            fetchChartData(next[0])
          } else {
            setSelectedItem(null)
            setChartData([])
          }
        }
        return next
      })
    }

    setDeletingIds(prev => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="bg-background px-5 pt-12 pb-24 flex items-center justify-center">
        <p className="text-sm text-foreground-secondary">Loading...</p>
      </div>
    )
  }

  // Empty state
  if (trackedItems.length === 0) {
    return (
      <div style={{ backgroundColor: '#f8f8f8', minHeight: '100vh', paddingBottom: 100 }}>
        <div style={{ paddingTop: 80, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#aaa' }}>No items tracked yet</p>
          <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Start scanning to track prices</p>
          <button
            onClick={() => router.push('/scan')}
            style={{
              background: '#534AB7',
              color: 'white',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 500,
              marginTop: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Scan a product
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: '#f8f8f8',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* PINNED SECTION */}
      <div style={{ flexShrink: 0 }}>
        {/* 1. CHART CARD */}
        <div
          style={{
            background: 'white',
            border: '0.5px solid #ebebeb',
            borderRadius: 12,
            padding: '9px 10px',
            marginLeft: 16,
            marginRight: 16,
            marginTop: 12,
          }}
        >
          {selectedItem && (
            <>
              {/* Title */}
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#111',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  margin: 0,
                }}
              >
                {selectedItem.title}
              </p>

              {/* Price + delta row */}
              {(() => {
                const latestCheck = latestChecks.get(selectedItem.id) ?? null
                const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : (latestCheck?.price ?? null)
                const maxPrice = chartData.length > 0 ? Math.max(...chartData.map(d => d.price)) : null

                let deltaEl: React.ReactNode = null
                if (chartData.length > 0 && currentPrice !== null && maxPrice !== null) {
                  if (currentPrice < maxPrice) {
                    const diff = maxPrice - currentPrice
                    deltaEl = (
                      <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>
                        ↓ ${diff.toFixed(2)} from high
                      </span>
                    )
                  } else {
                    deltaEl = (
                      <span style={{ fontSize: 12, color: '#D85A30', fontWeight: 500 }}>
                        At high
                      </span>
                    )
                  }
                }

                return (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>
                      {currentPrice !== null ? formatCurrency(currentPrice) : '—'}
                    </span>
                    {deltaEl}
                  </div>
                )
              })()}
            </>
          )}

          {/* Chart area */}
          {chartLoading ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: '#aaa' }}>Loading chart…</p>
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '0 16px' }}>
                Price history will appear after the first weekly check
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#534AB7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#534AB7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-foreground-secondary, #6b7280)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    tick={{ fontSize: 10, fill: 'var(--color-foreground-secondary, #6b7280)' }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#534AB7"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#534AB7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Stat pills */}
              {(() => {
                const prices = chartData.map(d => d.price)
                const current = prices[prices.length - 1]
                const low = Math.min(...prices)
                const avg = prices.reduce((a, b) => a + b, 0) / prices.length
                return (
                  <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                    <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>Current</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111', margin: 0 }}>{formatCurrency(current)}</p>
                    </div>
                    <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>90-day low</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#D85A30', margin: 0 }}>{formatCurrency(low)}</p>
                    </div>
                    <div style={{ flex: 1, background: '#f8f8f8', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>Avg</p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111', margin: 0 }}>{formatCurrency(avg)}</p>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* 2. ITEM COUNT + TRACK NEW row */}
        <div
          style={{
            marginLeft: 16,
            marginRight: 16,
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {trackedItems.length} items tracked
          </span>
          <button
            onClick={() => router.push('/scan')}
            style={{
              background: '#f4f3fe',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11,
              color: '#534AB7',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            + Track new
          </button>
        </div>
      </div>

      {/* SCROLLABLE SECTION */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* 3. ITEM LIST CARD */}
        <div
          style={{
            background: 'white',
            border: '0.5px solid #ebebeb',
            borderRadius: 12,
            marginLeft: 16,
            marginRight: 16,
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          {trackedItems.map((item, index) => {
            const latestCheck = latestChecks.get(item.id) ?? null
            const isSelected = selectedItem?.id === item.id
            const isLast = index === trackedItems.length - 1

            // vs-low calculation
            let vsLowEl: React.ReactNode = <span style={{ color: '#ccc' }}>—</span>
            if (latestCheck !== null && item.min_observed_price !== null) {
              const diff = latestCheck.price - item.min_observed_price
              if (diff > 0.005) {
                vsLowEl = (
                  <span style={{ color: '#D85A30' }}>+${diff.toFixed(2)} vs low</span>
                )
              } else {
                vsLowEl = (
                  <span style={{ color: '#1D9E75' }}>At low ✓</span>
                )
              }
            }

            // Relative time
            const relTime = latestCheck?.checked_at
              ? formatRelativeDate(latestCheck.checked_at)
              : item.last_checked_at
              ? formatRelativeDate(item.last_checked_at)
              : null

            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                style={{
                  padding: '10px 12px',
                  borderBottom: isLast ? 'none' : '0.5px solid #f5f5f5',
                  borderLeft: isSelected ? '2px solid #534AB7' : '2px solid transparent',
                  background: isSelected ? '#fafafa' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                {/* Left side */}
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#111',
                      margin: 0,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0 0' }}>
                    {latestCheck
                      ? `${formatCurrency(latestCheck.price)} · ${latestCheck.retailer_domain ? cleanDomain(latestCheck.retailer_domain) : '—'}`
                      : 'Not checked yet'}
                  </p>
                </div>

                {/* Right side */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, margin: 0 }}>
                    {vsLowEl}
                  </p>
                  {relTime && (
                    <p style={{ fontSize: 10, color: '#ccc', margin: '2px 0 0 0' }}>
                      {relTime}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 4. Bottom spacer */}
        <div style={{ height: 100 }} />
      </div>
    </div>
  )
}
