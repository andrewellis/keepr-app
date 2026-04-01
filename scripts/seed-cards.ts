import { createClient } from '@supabase/supabase-js'
import { CARD_DEFAULTS } from '../lib/cards/defaults'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

async function main() {
  let totalCards = 0
  let totalCategoryRates = 0

  for (const card of CARD_DEFAULTS) {
    // Upsert the card (match on name)
    const { data: cardRow, error: cardError } = await supabase
      .from('cards')
      .upsert(
        {
          name: card.name,
          issuer: card.issuer,
          network: card.network,
          base_rate: card.base_rate,
          has_rotating_categories: card.has_rotating_categories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name' }
      )
      .select('id')
      .single()

    if (cardError || !cardRow) {
      console.error(`Error upserting card "${card.name}":`, cardError)
      process.exit(1)
    }

    const cardId = cardRow.id

    // Upsert all category rates for this card
    if (card.category_rates.length > 0) {
      const ratesToUpsert = card.category_rates.map((cr) => ({
        card_id: cardId,
        category: cr.category,
        rate: cr.rate,
        is_rotating: cr.is_rotating,
        notes: cr.notes ?? null,
      }))

      const { error: ratesError } = await supabase
        .from('card_category_rates')
        .upsert(ratesToUpsert, { onConflict: 'card_id,category' })

      if (ratesError) {
        console.error(
          `Error upserting category rates for "${card.name}":`,
          ratesError
        )
        process.exit(1)
      }

      totalCategoryRates += card.category_rates.length
    }

    console.log(`Seeded: ${card.name}`)
    totalCards++
  }

  console.log(`Done. ${totalCards} cards, ${totalCategoryRates} category rates seeded.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
