/**
 * Script to run SQL statements against Supabase using the service role key.
 * Usage: npx tsx --env-file=.env.local scripts/run-sql.ts
 *
 * Requires environment variables (loaded from .env.local via --env-file flag):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function main() {
  // We'll use the Supabase Management API to run SQL
  const projectId = 'yihydeqpetvcwcgdlobo'

  async function execSQL(sql: string, label: string) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`❌ ${label}: HTTP ${res.status} - ${text}`)
      return false
    }

    console.log(`✅ ${label}`)
    return true
  }

  // Part 1: Create tables
  console.log('\n=== PART 1: Creating tables ===\n')

  await execSQL(`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      card_name text NOT NULL,
      issuer text NOT NULL,
      network text,
      annual_fee_cents integer DEFAULT 0,
      base_rate numeric NOT NULL,
      reward_currency text NOT NULL,
      category_rates jsonb NOT NULL DEFAULT '{}',
      category_caps jsonb DEFAULT '{}',
      is_business boolean DEFAULT false,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `, 'CREATE TABLE credit_cards')

  await execSQL(`
    CREATE TABLE IF NOT EXISTS user_cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      card_id uuid REFERENCES credit_cards(id) ON DELETE CASCADE NOT NULL,
      is_primary boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, card_id)
    )
  `, 'CREATE TABLE user_cards')

  await execSQL(`
    CREATE TABLE IF NOT EXISTS merchant_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_name text NOT NULL,
      category text NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(merchant_name)
    )
  `, 'CREATE TABLE merchant_categories')

  await execSQL(`ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY`, 'RLS credit_cards')
  await execSQL(`ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY`, 'RLS user_cards')
  await execSQL(`ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY`, 'RLS merchant_categories')

  await execSQL(`CREATE POLICY "Anyone can read credit cards" ON credit_cards FOR SELECT USING (true)`, 'Policy: read credit_cards')
  await execSQL(`CREATE POLICY "Users can read own cards" ON user_cards FOR SELECT USING (auth.uid() = user_id)`, 'Policy: read user_cards')
  await execSQL(`CREATE POLICY "Users can insert own cards" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id)`, 'Policy: insert user_cards')
  await execSQL(`CREATE POLICY "Users can delete own cards" ON user_cards FOR DELETE USING (auth.uid() = user_id)`, 'Policy: delete user_cards')
  await execSQL(`CREATE POLICY "Anyone can read merchant categories" ON merchant_categories FOR SELECT USING (true)`, 'Policy: read merchant_categories')

  console.log('\n=== PART 1 COMPLETE ===\n')
}

main().catch(console.error)
