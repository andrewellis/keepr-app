'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserCardWithRates, CardCategoryRate } from '@/lib/cards/recommender'

export interface UserCard {
  userCardId: string
  cardId: string
  name: string
  issuer: string
  network: string
  base_rate: number
  has_rotating_categories: boolean
}

export type { UserCardWithRates, CardCategoryRate }

export interface AvailableCard {
  id: string
  name: string
  issuer: string
  network: string
  base_rate: number
  has_rotating_categories: boolean
}

/**
 * Fetch all cards available in the system (public read).
 */
export async function getAllCards(): Promise<AvailableCard[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('cards')
    .select('id, name, issuer, network, base_rate, has_rotating_categories')
    .order('issuer', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('getAllCards error:', error)
    return []
  }

  return (data ?? []) as AvailableCard[]
}

/**
 * Fetch the authenticated user's cards joined with card data.
 */
export async function getUserCards(userId: string): Promise<UserCard[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_cards')
    .select(
      `
      id,
      card_id,
      cards (
        id,
        name,
        issuer,
        network,
        base_rate,
        has_rotating_categories
      )
    `
    )
    .eq('user_id', userId)

  if (error) {
    console.error('getUserCards error:', error)
    return []
  }

  // Supabase infers the joined relation as an array; handle both array and object shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const card = Array.isArray(row.cards) ? row.cards[0] : row.cards
    return {
      userCardId: row.id as string,
      cardId: row.card_id as string,
      name: (card?.name ?? '') as string,
      issuer: (card?.issuer ?? '') as string,
      network: (card?.network ?? '') as string,
      base_rate: (card?.base_rate ?? 0) as number,
      has_rotating_categories: (card?.has_rotating_categories ?? false) as boolean,
    }
  })
}

/**
 * Fetch the authenticated user's cards joined with card data AND category rates.
 * Used by the card recommender to find the best card for a given spending category.
 */
export async function getUserCardsWithRates(userId: string): Promise<UserCardWithRates[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_cards')
    .select(
      `
      id,
      card_id,
      cards (
        id,
        name,
        issuer,
        network,
        base_rate,
        has_rotating_categories,
        card_category_rates (
          category,
          rate,
          is_rotating,
          notes
        )
      )
    `
    )
    .eq('user_id', userId)

  if (error) {
    console.error('getUserCardsWithRates error:', error)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const card = Array.isArray(row.cards) ? row.cards[0] : row.cards
    const rawRates = Array.isArray(card?.card_category_rates)
      ? card.card_category_rates
      : card?.card_category_rates
        ? [card.card_category_rates]
        : []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryRates: CardCategoryRate[] = rawRates.map((r: any) => ({
      category: r.category as string,
      rate: Number(r.rate),
      is_rotating: Boolean(r.is_rotating),
      notes: r.notes ?? null,
    }))

    return {
      userCardId: row.id as string,
      cardId: row.card_id as string,
      name: (card?.name ?? '') as string,
      issuer: (card?.issuer ?? '') as string,
      network: (card?.network ?? '') as string,
      base_rate: Number(card?.base_rate ?? 0),
      has_rotating_categories: Boolean(card?.has_rotating_categories ?? false),
      categoryRates,
    }
  })
}

/**
 * Add a card to the user's list. Returns an error string if it already exists.
 */
export async function addUserCard(
  userId: string,
  cardId: string
): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_cards')
    .insert({ user_id: userId, card_id: cardId })

  if (error) {
    if (error.code === '23505') {
      // unique constraint violation
      return { error: 'Card already added.' }
    }
    console.error('addUserCard error:', error)
    return { error: error.message }
  }

  return {}
}

/**
 * Remove a card from the user's list.
 */
export async function removeUserCard(
  userId: string,
  cardId: string
): Promise<{ error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId)

  if (error) {
    console.error('removeUserCard error:', error)
    return { error: error.message }
  }

  return {}
}
