/**
 * Script to check which tables exist in the Supabase database.
 * Usage: npx tsx --env-file=.env.local scripts/create-tables.ts
 *
 * Requires environment variables (loaded from .env.local via --env-file flag):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

async function checkTable(tableName: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (res.ok) {
    console.log(`✅ ${tableName} table exists`)
  } else {
    const err = await res.json()
    console.log(`❌ ${tableName} does not exist: ${err.message}`)
  }
}

async function main() {
  console.log('Checking tables...\n')
  await checkTable('credit_cards')
  await checkTable('credit_card_selections')
  await checkTable('merchant_categories')
  await checkTable('user_cards')
  await checkTable('cards')
}

main().catch(console.error)
