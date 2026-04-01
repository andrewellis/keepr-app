'use client'

import { useState, useTransition } from 'react'
import { removeUserCard } from '@/lib/cards/actions'
import type { UserCard } from '@/lib/cards/actions'

interface UserCardListProps {
  userId: string
  initialCards: UserCard[]
}

export default function UserCardList({ userId, initialCards }: UserCardListProps) {
  const [cards, setCards] = useState<UserCard[]>(initialCards)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleRemove(card: UserCard) {
    setRemovingId(card.cardId)
    setErrorMap((prev) => {
      const next = { ...prev }
      delete next[card.cardId]
      return next
    })

    startTransition(async () => {
      const result = await removeUserCard(userId, card.cardId)
      if (result.error) {
        setErrorMap((prev) => ({ ...prev, [card.cardId]: result.error! }))
      } else {
        setCards((prev) => prev.filter((c) => c.cardId !== card.cardId))
      }
      setRemovingId(null)
    })
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary text-center py-4 px-2">
        No cards added yet. Add your cards above to get personalized recommendations.
      </p>
    )
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background">
      <ul>
        {cards.map((card, idx) => {
          const isRemoving = removingId === card.cardId && isPending
          const cardError = errorMap[card.cardId]

          return (
            <li key={card.userCardId}>
              {idx > 0 && <div className="h-px bg-border mx-4" />}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {card.name}
                  </p>
                  <p className="text-xs text-foreground-secondary">
                    {card.issuer} · {card.base_rate}% base
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
                  onClick={() => handleRemove(card)}
                  disabled={isRemoving}
                  className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground-secondary hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                >
                  {isRemoving ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
