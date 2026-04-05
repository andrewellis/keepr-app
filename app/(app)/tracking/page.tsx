import { createClient } from '@/lib/supabase/server'

type TrackedItem = {
  id: string
  title: string
  category: string | null
  search_query: string | null
  aggressive: boolean
  min_observed_price: number | null
  created_at: string
  last_checked_at: string | null
}

type PriceCheck = {
  tracked_item_id: string
  price: number
  retailer_domain: string | null
  checked_at: string
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

export default async function TrackingPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-5 pt-12 pb-24 flex items-center justify-center">
        <p className="text-sm text-foreground-secondary">Sign in to view your tracked items.</p>
      </div>
    )
  }

  const { data: trackedItems } = await supabase
    .from('tracked_items')
    .select('id, title, category, search_query, aggressive, min_observed_price, created_at, last_checked_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: latestChecks } = await supabase
    .from('price_checks')
    .select('tracked_item_id, price, retailer_domain, checked_at')
    .in('tracked_item_id', (trackedItems ?? []).map((i: TrackedItem) => i.id))
    .order('checked_at', { ascending: false })

  // Build map: tracked_item_id → first (latest) price check
  const latestCheckMap = new Map<string, PriceCheck>()
  for (const check of latestChecks ?? []) {
    if (!latestCheckMap.has(check.tracked_item_id)) {
      latestCheckMap.set(check.tracked_item_id, check as PriceCheck)
    }
  }

  const items: TrackedItem[] = trackedItems ?? []

  return (
    <div className="min-h-screen bg-background px-5 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tracked Items</h1>
        {items.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-semibold bg-[#534AB7] text-white">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
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
        <div className="space-y-3">
          {items.map((item) => {
            const latestCheck = latestCheckMap.get(item.id) ?? null
            const currentPrice = latestCheck?.price ?? null
            const addedPrice = item.min_observed_price

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
                className="bg-surface border border-border rounded-2xl px-4 py-4"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
                    {item.title}
                  </p>
                  {item.aggressive && (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#534AB7]/10 text-[#534AB7]">
                      Daily
                    </span>
                  )}
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
      )}
    </div>
  )
}
