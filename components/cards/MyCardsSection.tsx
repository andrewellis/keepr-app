'use client'

import { useState } from 'react'
import CardSelector from './CardSelector'
import UserCardList from './UserCardList'
import type { AvailableCard, UserCard } from '@/lib/cards/actions'

interface MyCardsSectionProps {
  userId: string
  allCards: AvailableCard[]
  initialUserCards: UserCard[]
}

export default function MyCardsSection({
  userId,
  allCards,
  initialUserCards,
}: MyCardsSectionProps) {
  const [userCards, setUserCards] = useState<UserCard[]>(initialUserCards)

  function handleCardAdded(card: AvailableCard) {
    // Optimistically add to the user's list with a temporary userCardId
    setUserCards((prev) => [
      ...prev,
      {
        userCardId: `temp-${card.id}`,
        cardId: card.id,
        name: card.name,
        issuer: card.issuer,
        network: card.network,
        base_rate: card.base_rate,
        has_rotating_categories: card.has_rotating_categories,
      },
    ])
  }

  const userCardIds = userCards.map((c) => c.cardId)

  return (
    <div>
      <CardSelector
        userId={userId}
        allCards={allCards}
        userCardIds={userCardIds}
        onCardAdded={handleCardAdded}
      />
      <div className="mt-3">
        <UserCardList userId={userId} initialCards={userCards} />
      </div>
    </div>
  )
}
