/**
 * Script to run SQL statements against Supabase using the service role key.
 * Usage: npx tsx scripts/run-sql.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yihydeqpetvcwcgdlobo.supabase.co'
const supabaseServiceRoleKey = 'sb_secret_KgkzE6mhXP7CQKttHntH0g_JNMVaGwS'

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

async function runSQL(sql: string, label: string): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    console.error(`❌ ${label}:`, error.message)
    throw error
  }
  console.log(`✅ ${label}`)
}

async function main() {
  // We'll use the Supabase Management API to run SQL
  const projectId = 'yihydeqpetvcwcgdlobo'
  const managementToken = supabaseServiceRoleKey

  async function execSQL(sql: string, label: string) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    
    if (!res.ok) {
      const text = await res.text()
      console.error(`❌ ${label}: HTTP ${res.status} - ${text}`)
      return false
    }
    
    const data = await res.json()
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
