/**
 * Card cashback recommender.
 *
 * Given a user's saved cards (with their category rates) and a card spending
 * category, returns the card that gives the best cashback rate for that category.
 */

export interface CardCategoryRate {
  category: string
  rate: number
  is_rotating: boolean
  notes?: string | null
}

export interface UserCardWithRates {
  userCardId: string
  cardId: string
  name: string
  issuer: string
  network: string
  base_rate: number
  has_rotating_categories: boolean
  categoryRates: CardCategoryRate[]
}

export interface CardRecommendation {
  cardName: string
  issuer: string
  rate: number
  isRotating: boolean
  notes?: string
}

/**
 * Returns the best card recommendation for a given card spending category.
 *
 * Logic:
 * - For each user card, find the rate for the given category (or fall back to base_rate)
 * - Return the card with the highest effective rate
 * - If no cards saved, return null
 * - Tiebreaker: higher base_rate wins
 */
export function getBestCardRecommendation(
  userCards: UserCardWithRates[],
  cardCategory: string
): CardRecommendation | null {
  if (!userCards || userCards.length === 0) return null

  let best: {
    card: UserCardWithRates
    rate: number
    isRotating: boolean
    notes?: string
  } | null = null

  for (const card of userCards) {
    // Find a specific rate for this category
    const categoryRate = card.categoryRates.find((r) => r.category === cardCategory)

    const effectiveRate = categoryRate ? Number(categoryRate.rate) : Number(card.base_rate)
    const isRotating = categoryRate ? categoryRate.is_rotating : false
    const notes = categoryRate?.notes ?? undefined

    if (
      best === null ||
      effectiveRate > best.rate ||
      (effectiveRate === best.rate && Number(card.base_rate) > Number(best.card.base_rate))
    ) {
      best = { card, rate: effectiveRate, isRotating, notes: notes ?? undefined }
    }
  }

  if (!best) return null

  return {
    cardName: best.card.name,
    issuer: best.card.issuer,
    rate: best.rate,
    isRotating: best.isRotating,
    notes: best.notes,
  }
}
