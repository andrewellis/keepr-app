'use client';

import { useEffect, useState, useCallback } from 'react'
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

function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
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

  return (
    <div className="bg-background px-5 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tracked Items</h1>
        {trackedItems.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-semibold bg-[#534AB7] text-white">
            {trackedItems.length}
          </span>
        )}
      </div>

      {trackedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center">
            <svg
              className="w-9 h-9 text-foreground-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold">No items tracked yet.</p>
            <p className="text-foreground-secondary text-sm mt-1">
              Scan a product and tap Track Price to get started.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Section 1 — Price history chart */}
          {selectedItem && (
            <div className="bg-surface border border-border rounded-2xl px-4 py-4 mb-4">
              <p className="text-sm font-semibold text-foreground mb-3 line-clamp-1">
                {selectedItem.title}
              </p>

              {chartLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-xs text-foreground-secondary">Loading chart…</p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-xs text-foreground-secondary text-center px-4">
                    Price history will appear after the first weekly check
                  </p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
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
                        tickFormatter={formatMonthYear}
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
                  <div className="flex gap-2 mt-3">
                    {(() => {
                      const prices = chartData.map(d => d.price)
                      const current = prices[prices.length - 1]
                      const low = Math.min(...prices)
                      const avg = prices.reduce((a, b) => a + b, 0) / prices.length
                      return (
                        <>
                          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
                            <p className="text-xs text-foreground-secondary mb-0.5">Current</p>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(current)}</p>
                          </div>
                          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
                            <p className="text-xs text-foreground-secondary mb-0.5">90-day low</p>
                            <p className="text-sm font-semibold" style={{ color: '#D85A30' }}>{formatCurrency(low)}</p>
                          </div>
                          <div className="flex-1 bg-background rounded-xl p-2.5 text-center">
                            <p className="text-xs text-foreground-secondary mb-0.5">Avg</p>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(avg)}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Section 2 — Tracked items list */}
          <div className="space-y-3">
            {trackedItems.map((item) => {
              const latestCheck = latestChecks.get(item.id) ?? null
              const currentPrice = latestCheck?.price ?? null
              const addedPrice = item.min_observed_price
              const isSelected = selectedItem?.id === item.id

              let delta: { text: string; color: string } | null = null
              if (currentPrice !== null && addedPrice !== null) {
                const diff = currentPrice - addedPrice
                if (diff < -0.005) {
                  delta = {
                    text: `↓ ${formatCurrency(Math.abs(diff))} lower`,
                    color: 'text-green-600',
                  }
                } else if (diff > 0.005) {
                  delta = {
                    text: `↑ ${formatCurrency(diff)} higher`,
                    color: 'text-red-500',
                  }
                }
              }

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`bg-surface border rounded-2xl px-4 py-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-[#534AB7]' : 'border-border'
                  }`}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.aggressive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#534AB7]/10 text-[#534AB7]">
                          Daily
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStopTracking(item.id)
                        }}
                        disabled={deletingIds.has(item.id)}
                        className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                      >
                        {deletingIds.has(item.id) ? 'Removing...' : '✕ Stop'}
                      </button>
                    </div>
                  </div>

                  {/* Price row */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-bold text-foreground">
                      {currentPrice !== null ? formatCurrency(currentPrice) : 'Not checked yet'}
                    </span>
                    {addedPrice !== null && (
                      <span className="text-xs text-foreground-secondary">
                        was {formatCurrency(addedPrice)}
                      </span>
                    )}
                    {addedPrice === null && currentPrice !== null && (
                      <span className="text-xs text-foreground-secondary">was —</span>
                    )}
                  </div>

                  {/* Delta */}
                  {delta && (
                    <p className={`text-xs font-medium mb-1 ${delta.color}`}>{delta.text}</p>
                  )}

                  {/* Retailer + last checked */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-foreground-secondary">
                      {latestCheck?.retailer_domain ?? '—'}
                    </span>
                    <span className="text-xs text-foreground-secondary">
                      {latestCheck?.checked_at
                        ? formatRelativeDate(latestCheck.checked_at)
                        : 'Never'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
