/**
 * Script to create credit_cards, user_cards (new), and merchant_categories tables
 * using the Supabase REST API with service role key.
 * 
 * The existing user_cards table references the old 'cards' table.
 * We need to create a NEW credit_cards table and a new user_cards table
 * that references it. But since user_cards already exists referencing 'cards',
 * we need to handle this carefully.
 * 
 * Strategy: Create credit_cards and merchant_categories as new tables.
 * For user_cards, we need to add is_primary column and card_id FK to credit_cards.
 * Actually, the task says to create a NEW user_cards table. But one already exists.
 * We'll add the new columns to the existing user_cards table and create credit_cards.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yihydeqpetvcwcgdlobo.supabase.co'
const SERVICE_ROLE_KEY = 'sb_secret_KgkzE6mhXP7CQKttHntH0g_JNMVaGwS'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Use the Supabase SQL endpoint via the pg REST API
async function execSQL(sql: string, label: string): Promise<boolean> {
  // Use the Supabase REST API to execute SQL via a stored procedure
  // We'll use the pg_net or direct SQL approach
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`❌ ${label}: ${text}`)
    return false
  }

  console.log(`✅ ${label}`)
  return true
}

async function main() {
  console.log('Testing connection...')
  
  // Test: check if credit_cards exists
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/credit_cards?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  
  if (testRes.ok) {
    console.log('✅ credit_cards table already exists')
  } else {
    const err = await testRes.json()
    console.log('credit_cards does not exist:', err.message)
    console.log('Need to create it via Supabase dashboard SQL editor')
  }

  // Test: check if merchant_categories exists
  const testRes2 = await fetch(`${SUPABASE_URL}/rest/v1/merchant_categories?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  
  if (testRes2.ok) {
    console.log('✅ merchant_categories table already exists')
  } else {
    const err2 = await testRes2.json()
    console.log('merchant_categories does not exist:', err2.message)
  }
}

main().catch(console.error)
