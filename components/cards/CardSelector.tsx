'use client'

import { useState, useTransition, useMemo } from 'react'
import { addUserCard } from '@/lib/cards/actions'
import type { AvailableCard } from '@/lib/cards/actions'

interface CardSelectorProps {
  userId: string
  allCards: AvailableCard[]
  userCardIds: string[]
  onCardAdded: (card: AvailableCard) => void
}

export default function CardSelector({
  userId,
  allCards,
  userCardIds,
  onCardAdded,
}: CardSelectorProps) {
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCards
    return allCards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q) ||
        c.network.toLowerCase().includes(q)
    )
  }, [query, allCards])

  function handleAdd(card: AvailableCard) {
    setAddingId(card.id)
    setErrorMap((prev) => {
      const next = { ...prev }
      delete next[card.id]
      return next
    })

    startTransition(async () => {
      const result = await addUserCard(userId, card.id)
      if (result.error) {
        setErrorMap((prev) => ({ ...prev, [card.id]: result.error! }))
      } else {
        onCardAdded(card)
      }
      setAddingId(null)
    })
  }

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-3">
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by card name or issuer…"
          className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-primary transition"
        />
      </div>

      {/* Results list */}
      {query.trim() !== '' && (
        <div className="border border-border rounded-xl overflow-hidden bg-background">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-foreground-secondary">
              No cards found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul>
              {filtered.map((card, idx) => {
                const isAdded = userCardIds.includes(card.id)
                const isLoading = addingId === card.id && isPending
                const cardError = errorMap[card.id]

                return (
                  <li key={card.id}>
                    {idx > 0 && <div className="h-px bg-border mx-4" />}
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {card.name}
                        </p>
                        <p className="text-xs text-foreground-secondary">
                          {card.issuer} · {card.network}
                        </p>
                        {card.has_rotating_categories && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            This card has rotating categories — rates shown are estimates
                          </p>
                        )}
                        {cardError && (
                          <p className="text-xs text-red-400 mt-0.5">{cardError}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(card)}
                        disabled={isAdded || isLoading}
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                          isAdded
                            ? 'bg-surface text-foreground-secondary border border-border cursor-default'
                            : 'bg-primary text-white hover:opacity-90 disabled:opacity-50'
                        }`}
                      >
                        {isLoading ? 'Adding…' : isAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
