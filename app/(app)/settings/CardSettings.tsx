'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditCard {
  id: string
  card_name: string
  issuer: string
  network: string | null
  annual_fee_cents: number
  base_rate: number
  reward_currency: string
  category_rates: Record<string, number>
  category_caps: Record<string, unknown>
  is_business: boolean
  is_active: boolean
}

interface UserCardSelection {
  id: string
  card_id: string
  is_primary: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCategoryKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildBonusSummary(categoryRates: Record<string, number>): string {
  const entries = Object.entries(categoryRates)
  if (entries.length === 0) return ''

  // Sort by rate descending, take top 3
  const top = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, rate]) => `${rate}x ${formatCategoryKey(key)}`)

  return top.join(', ')
}

function groupByIssuer(cards: CreditCard[]): Record<string, CreditCard[]> {
  const groups: Record<string, CreditCard[]> = {}
  for (const card of cards) {
    if (!groups[card.issuer]) groups[card.issuer] = []
    groups[card.issuer].push(card)
  }
  return groups
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CardSettings() {
  const [allCards, setAllCards] = useState<CreditCard[]>([])
  const [userSelections, setUserSelections] = useState<UserCardSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const supabase = createClient()

  // ── Fetch data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      try {
        // Fetch all credit cards
        const { data: cards, error: cardsError } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('is_active', true)
          .order('issuer', { ascending: true })
          .order('card_name', { ascending: true })

        if (cardsError) throw cardsError

        // Fetch user's selected cards
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const { data: selections, error: selectionsError } = await supabase
          .from('credit_card_selections')
          .select('id, card_id, is_primary')
          .eq('user_id', user.id)

        if (selectionsError) throw selectionsError

        setAllCards(cards ?? [])
        setUserSelections(selections ?? [])
      } catch (err) {
        console.error('CardSettings load error:', err)
        setError('Failed to load cards. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived state ────────────────────────────────────────────────────────
  const selectedCardIds = useMemo(
    () => new Set(userSelections.map((s) => s.card_id)),
    [userSelections]
  )

  const primaryCardId = useMemo(
    () => userSelections.find((s) => s.is_primary)?.card_id ?? null,
    [userSelections]
  )

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allCards
    return allCards.filter(
      (c) =>
        c.card_name.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q)
    )
  }, [allCards, search])

  const groupedCards = useMemo(() => groupByIssuer(filteredCards), [filteredCards])
  const sortedIssuers = useMemo(() => Object.keys(groupedCards).sort(), [groupedCards])

  // ── Actions ──────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setActionSuccess(msg)
    setActionError(null)
    setTimeout(() => setActionSuccess(null), 3000)
  }

  function showError(msg: string) {
    setActionError(msg)
    setActionSuccess(null)
  }

  async function handleToggle(card: CreditCard) {
    const isSelected = selectedCardIds.has(card.id)

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showError('Not authenticated'); return }

      if (isSelected) {
        // Remove card
        const { error } = await supabase
          .from('credit_card_selections')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', card.id)

        if (error) {
          showError(`Failed to remove ${card.card_name}`)
          return
        }

        setUserSelections((prev) => prev.filter((s) => s.card_id !== card.id))
        showSuccess(`Removed ${card.card_name}`)
      } else {
        // Add card
        const { data, error } = await supabase
          .from('credit_card_selections')
          .insert({ user_id: user.id, card_id: card.id, is_primary: false })
          .select('id, card_id, is_primary')
          .single()

        if (error) {
          showError(`Failed to add ${card.card_name}`)
          return
        }

        setUserSelections((prev) => [...prev, data])
        showSuccess(`Added ${card.card_name}`)
      }
    })
  }

  async function handleSetPrimary(card: CreditCard) {
    if (!selectedCardIds.has(card.id)) return

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showError('Not authenticated'); return }

      // Clear all primary flags
      const { error: clearError } = await supabase
        .from('credit_card_selections')
        .update({ is_primary: false })
        .eq('user_id', user.id)

      if (clearError) {
        showError('Failed to update primary card')
        return
      }

      // Set new primary
      const { error: setError } = await supabase
        .from('credit_card_selections')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('card_id', card.id)

      if (setError) {
        showError('Failed to set primary card')
        return
      }

      setUserSelections((prev) =>
        prev.map((s) => ({ ...s, is_primary: s.card_id === card.id }))
      )
      showSuccess(`${card.card_name} set as primary`)
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by card name or issuer…"
          className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary transition"
        />
      </div>

      {/* Status messages */}
      {actionSuccess && (
        <p className="text-xs text-green-600 font-medium mb-3">✓ {actionSuccess}</p>
      )}
      {actionError && (
        <p className="text-xs text-red-600 mb-3">{actionError}</p>
      )}

      {/* Selected count */}
      {selectedCardIds.size > 0 && (
        <p className="text-xs text-foreground-secondary mb-3">
          {selectedCardIds.size} card{selectedCardIds.size !== 1 ? 's' : ''} selected
          {primaryCardId && (
            <span className="ml-1">
              · Primary: <span className="font-medium text-foreground">
                {allCards.find((c) => c.id === primaryCardId)?.card_name ?? ''}
              </span>
            </span>
          )}
        </p>
      )}

      {/* No results */}
      {sortedIssuers.length === 0 && (
        <p className="text-sm text-foreground-secondary text-center py-6">
          No cards found for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Cards grouped by issuer */}
      <div className="space-y-4">
        {sortedIssuers.map((issuer) => (
          <div key={issuer}>
            <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2 px-1">
              {issuer}
            </p>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {groupedCards[issuer].map((card, idx) => {
                const isSelected = selectedCardIds.has(card.id)
                const isPrimary = primaryCardId === card.id
                const bonusSummary = buildBonusSummary(card.category_rates)

                return (
                  <div key={card.id}>
                    {idx > 0 && <div className="h-px bg-border mx-4" />}
                    <div className="flex items-start justify-between px-4 py-3 gap-3">
                      {/* Card info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">
                            {card.card_name}
                          </p>
                          {isPrimary && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              Primary
                            </span>
                          )}
                          {card.is_business && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Business
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#666666' }}>
                          {card.base_rate}x base
                          {bonusSummary && (
                            <span className="ml-1">· {bonusSummary}</span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#666666' }}>
                          {card.annual_fee_cents === 0
                            ? '$0/yr'
                            : `$${(card.annual_fee_cents / 100).toFixed(0)}/yr`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && !isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(card)}
                            disabled={isPending}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-foreground-secondary hover:border-primary hover:text-primary disabled:opacity-50 transition"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(card)}
                          disabled={isPending}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                            isSelected
                              ? 'bg-surface border border-border text-foreground-secondary hover:border-red-300 hover:text-red-500'
                              : 'bg-primary text-white hover:opacity-90'
                          }`}
                        >
                          {isSelected ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground-secondary mt-4 text-center">
        We never ask for card numbers. You&rsquo;re just telling us which cards you have.
      </p>
    </div>
  )
}
