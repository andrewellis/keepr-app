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

// Map from title-cased key (after underscore→space conversion) to display label
const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  // Issuer-prefixed portal/travel categories
  'Capital One Entertainment': 'Entertainment',
  'Capital One Travel': 'Travel',
  'Capital One Business Travel': 'Business Travel',
  'Amextravel Flights Hotels': 'Amex Travel',
  'Hotels Cars Capital One Portal': 'Portal Hotels/Cars',
  'Hotels Cars Chase Portal': 'Portal Hotels/Cars',
  'Flights Chase Portal': 'Portal Flights',
  'Flights Amex Portal': 'Portal Flights',
  'Us Bank Portal Hotels Cars': 'Portal Hotels/Cars',
  'Us Bank Portal Travel': 'Portal Travel',
  'Citi Travel Portal': 'Portal Travel',
  // Rotating / choice categories
  'Rotating Quarterly': 'Rotating 5% Categories',
  'Top 2 Categories': 'Top 2 Spend Categories',
  'Top Spending Category': 'Top Spend Category',
  'Choice Category 1': 'Choice Cat. 1',
  'Choice Category 2': 'Choice Cat. 2',
  'Choice Category 3': 'Everyday Cat.',
  // Airlines / hotels
  'Rapid Rewards Partners': 'RR Partners',
  'Southwest Airlines': 'Southwest',
  'United Airlines': 'United',
  'American Airlines': 'AA Purchases',
  'Delta Airlines': 'Delta',
  'Flights Direct': 'Direct Flights',
  'Hotels Direct': 'Direct Hotels',
  'Airline Tickets Direct': 'Direct Airline Tickets',
  'Ihg Hotels': 'IHG Hotels',
  'Hyatt Hotels': 'Hyatt',
  'Hilton Hotels': 'Hilton',
  'Marriott Hotels': 'Marriott',
  // Misc
  'Internet Phone': 'Internet/Phone',
  'Office Supplies': 'Office',
  'Online Retail': 'Online Shopping',
  'Us Online Retail': 'Online Shopping',
  'Booking Com': 'Booking.com',
  'Ev Charging': 'EV Charging',
}

function formatCategoryName(key: string): string {
  // Convert underscores to spaces and title-case
  const titled = key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return CATEGORY_DISPLAY_MAP[titled] ?? titled
}

function buildBonusSummary(categoryRates: Record<string, number>): string {
  const entries = Object.entries(categoryRates)
  if (entries.length === 0) return ''
  const top = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, rate]) => `${rate}x ${formatCategoryName(key)}`)
  return top.join(', ')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CardRowProps {
  card: CreditCard
  isSelected: boolean
  isPrimary: boolean
  isPending: boolean
  onToggle: (card: CreditCard) => void
  onSetPrimary: (card: CreditCard) => void
}

function CardRow({ card, isSelected, isPrimary, isPending, onToggle, onSetPrimary }: CardRowProps) {
  const bonusSummary = buildBonusSummary(card.category_rates ?? {})
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-3">
      {/* Left border accent for primary */}
      {isPrimary && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: '#534AB7' }} />
      )}
      {/* Card info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
            {card.card_name}
          </p>
          {isPrimary && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#EEEDFE', color: '#534AB7' }}
            >
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
          {bonusSummary && <span className="ml-1">· {bonusSummary}</span>}
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
            onClick={() => onSetPrimary(card)}
            disabled={isPending}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border transition disabled:opacity-50"
            style={{ borderColor: '#E5E5E3', color: '#666666' }}
          >
            Set Primary
          </button>
        )}
        <button
          onClick={() => onToggle(card)}
          disabled={isPending}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
            isSelected
              ? 'border hover:border-red-300 hover:text-red-500'
              : 'text-white hover:opacity-90'
          }`}
          style={
            isSelected
              ? { backgroundColor: '#F8F8F6', borderColor: '#E5E5E3', color: '#666666' }
              : { backgroundColor: '#534AB7' }
          }
        >
          {isSelected ? 'Remove' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CardSettings() {
  const [allCards, setAllCards] = useState<CreditCard[]>([])
  const [userSelections, setUserSelections] = useState<UserCardSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIssuer, setSelectedIssuer] = useState<string | null>(null)
  const [yourCardsExpanded, setYourCardsExpanded] = useState(false)
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
        const { data: cards, error: cardsError } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('is_active', true)
          .order('issuer', { ascending: true })
          .order('card_name', { ascending: true })

        if (cardsError) throw cardsError

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

  const userSelectedCards = useMemo(
    () => allCards.filter((c) => selectedCardIds.has(c.id)),
    [allCards, selectedCardIds]
  )

  // Issuers derived from active cards
  const issuers = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const card of allCards) {
      counts[card.issuer] = (counts[card.issuer] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([issuer, count]) => ({ issuer, count }))
  }, [allCards])

  // Search mode: filter all cards
  const searchQuery = search.trim().toLowerCase()
  const isSearching = searchQuery.length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    return allCards.filter(
      (c) =>
        c.card_name.toLowerCase().includes(searchQuery) ||
        c.issuer.toLowerCase().includes(searchQuery)
    )
  }, [allCards, searchQuery, isSearching])

  // Cards for selected issuer
  const issuerCards = useMemo(() => {
    if (!selectedIssuer) return []
    return allCards.filter((c) => c.issuer === selectedIssuer)
  }, [allCards, selectedIssuer])

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
        const { error } = await supabase
          .from('credit_card_selections')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', card.id)
        if (error) { showError(`Failed to remove ${card.card_name}`); return }
        setUserSelections((prev) => prev.filter((s) => s.card_id !== card.id))
        showSuccess(`Removed ${card.card_name}`)
      } else {
        const { data, error } = await supabase
          .from('credit_card_selections')
          .insert({ user_id: user.id, card_id: card.id, is_primary: false })
          .select('id, card_id, is_primary')
          .single()
        if (error) { showError(`Failed to add ${card.card_name}`); return }
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

      const { error: clearError } = await supabase
        .from('credit_card_selections')
        .update({ is_primary: false })
        .eq('user_id', user.id)
      if (clearError) { showError('Failed to update primary card'); return }

      const { error: setErr } = await supabase
        .from('credit_card_selections')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('card_id', card.id)
      if (setErr) { showError('Failed to set primary card'); return }

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
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#F8F8F6', border: '1px solid #E5E5E3' }} />
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

  // Helper to render a list of cards (used in search results and issuer view)
  function renderCardList(cards: CreditCard[]) {
    if (cards.length === 0) {
      return (
        <p className="text-sm text-center py-6" style={{ color: '#666666' }}>
          No cards found.
        </p>
      )
    }
    return (
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#F8F8F6', border: '1px solid #E5E5E3' }}>
        {cards.map((card, idx) => (
          <div key={card.id} className="relative">
            {idx > 0 && <div className="h-px mx-4" style={{ backgroundColor: '#E5E5E3' }} />}
            <CardRow
              card={card}
              isSelected={selectedCardIds.has(card.id)}
              isPrimary={primaryCardId === card.id}
              isPending={isPending}
              onToggle={handleToggle}
              onSetPrimary={handleSetPrimary}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: '#666666' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            // Clear issuer selection when searching
            if (e.target.value.trim()) setSelectedIssuer(null)
          }}
          placeholder="Search by card name or issuer…"
          className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition"
          style={{
            backgroundColor: '#F8F8F6',
            border: '1px solid #E5E5E3',
            color: '#1a1a1a',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: '#666666' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Status messages */}
      {actionSuccess && (
        <p className="text-xs font-medium mb-3 text-green-600">✓ {actionSuccess}</p>
      )}
      {actionError && (
        <p className="text-xs mb-3 text-red-600">{actionError}</p>
      )}

      {/* ── Your Cards section ── */}
      <div className="mb-5">
        <button
          onClick={() => setYourCardsExpanded((v) => !v)}
          className="flex items-center justify-between w-full mb-2 px-1"
        >
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#666666' }}>
            Your Cards
            {userSelectedCards.length > 0 && (
              <span className="ml-1.5 font-normal normal-case tracking-normal" style={{ color: '#534AB7' }}>
                ({userSelectedCards.length})
              </span>
            )}
          </span>
          <svg
            className="w-4 h-4 transition-transform"
            style={{
              color: '#666666',
              transform: yourCardsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {yourCardsExpanded && (
          <div>
            {userSelectedCards.length === 0 ? (
              <p className="text-xs px-1" style={{ color: '#666666' }}>
                No cards added yet. Select your credit cards below to get personalized rewards recommendations.
              </p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#F8F8F6', border: '1px solid #E5E5E3' }}>
                {userSelectedCards.map((card, idx) => {
                  const isPrimary = primaryCardId === card.id
                  return (
                    <div key={card.id} className="relative">
                      {isPrimary && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: '#534AB7' }}
                        />
                      )}
                      {idx > 0 && <div className="h-px mx-4" style={{ backgroundColor: '#E5E5E3' }} />}
                      <CardRow
                        card={card}
                        isSelected={true}
                        isPrimary={isPrimary}
                        isPending={isPending}
                        onToggle={handleToggle}
                        onSetPrimary={handleSetPrimary}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Search results (fast path) ── */}
      {isSearching && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666666' }}>
            Search Results
          </p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#666666' }}>
              No cards found for &ldquo;{search}&rdquo;
            </p>
          ) : (
            renderCardList(searchResults)
          )}
        </div>
      )}

      {/* ── Issuer grid (Step 1) ── */}
      {!isSearching && !selectedIssuer && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666666' }}>
            Browse by Issuer
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {issuers.map(({ issuer, count }) => (
              <button
                key={issuer}
                onClick={() => setSelectedIssuer(issuer)}
                className="flex flex-col items-start px-3 py-3 rounded-xl text-left transition"
                style={{
                  backgroundColor: '#F8F8F6',
                  border: '1px solid #E5E5E3',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EEEDFE'
                  e.currentTarget.style.borderColor = '#534AB7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F8F6'
                  e.currentTarget.style.borderColor = '#E5E5E3'
                }}
              >
                <span className="text-sm font-medium leading-tight" style={{ color: '#1a1a1a' }}>
                  {issuer}
                </span>
                <span className="text-xs mt-0.5" style={{ color: '#666666' }}>
                  {count} card{count !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Issuer card list (Step 2) ── */}
      {!isSearching && selectedIssuer && (
        <div>
          {/* Back button */}
          <button
            onClick={() => setSelectedIssuer(null)}
            className="flex items-center gap-1.5 mb-3 text-sm font-medium transition"
            style={{ color: '#534AB7' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Issuers
          </button>

          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#666666' }}>
            {selectedIssuer}
          </p>

          {renderCardList(issuerCards)}
        </div>
      )}

      <p className="text-xs mt-4 text-center" style={{ color: '#666666' }}>
        We never ask for card numbers. You&rsquo;re just telling us which cards you have.
      </p>
    </div>
  )
}
