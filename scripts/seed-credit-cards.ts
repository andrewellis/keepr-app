/**
 * Seed script for credit_cards and merchant_categories tables.
 * Run with: npx tsx --env-file=.env.local scripts/seed-credit-cards.ts
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

const CREDIT_CARDS = [
  // Card 1
  {
    card_name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { travel_chase_portal: 5, dining: 3, streaming: 3, travel: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 2
  {
    card_name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 55000,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { flights_chase_portal: 5, hotels_cars_chase_portal: 10, dining: 3, travel: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 3
  {
    card_name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'cashback_percent',
    category_rates: { travel_chase_portal: 5, dining: 3, drugstores: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 4
  {
    card_name: 'Chase Freedom Flex',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { travel_chase_portal: 5, rotating_quarterly: 5, dining: 3, drugstores: 3 },
    category_caps: { rotating_quarterly: { cap_cents: 150000, period: 'quarterly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 5
  {
    card_name: 'Chase Ink Business Preferred',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { travel: 3, shipping: 3, internet_phone: 3, advertising: 3, streaming: 3 },
    category_caps: { 'travel+shipping+internet_phone+advertising+streaming': { cap_cents: 15000000, period: 'annual', fallback_rate: 1 } },
    is_business: true,
  },
  // Card 6
  {
    card_name: 'Marriott Bonvoy Boundless',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 2,
    reward_currency: 'points',
    category_rates: { marriott_hotels: 6, gas: 3, grocery: 3, dining: 3 },
    category_caps: { 'gas+grocery+dining': { cap_cents: 600000, period: 'annual', fallback_rate: 2 } },
    is_business: false,
  },
  // Card 7
  {
    card_name: 'United Explorer',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'miles',
    category_rates: { united_airlines: 2, hotels: 2, dining: 2, streaming: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 8
  {
    card_name: 'Southwest Rapid Rewards Plus',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 6900,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { southwest_airlines: 2, rapid_rewards_partners: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 9
  {
    card_name: 'Amex Gold',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 32500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { dining: 4, grocery: 4, flights_direct: 3 },
    category_caps: { grocery: { cap_cents: 2500000, period: 'annual', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 10
  {
    card_name: 'Amex Platinum',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 69500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { flights_direct: 5, flights_amex_portal: 5 },
    category_caps: {},
    is_business: false,
  },
  // Card 11
  {
    card_name: 'Blue Cash Preferred',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { grocery: 6, streaming: 6, transit: 3, gas: 3 },
    category_caps: { grocery: { cap_cents: 600000, period: 'annual', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 12
  {
    card_name: 'Blue Cash Everyday',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { grocery: 3, gas: 3, online_retail: 3 },
    category_caps: { grocery: { cap_cents: 600000, period: 'annual', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 13
  {
    card_name: 'Amex Green',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 15000,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { travel: 3, transit: 3, dining: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 14
  {
    card_name: 'Delta SkyMiles Gold',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 15000,
    base_rate: 1,
    reward_currency: 'miles',
    category_rates: { delta_airlines: 2, dining: 2, grocery: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 15
  {
    card_name: 'Capital One Venture X',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 39500,
    base_rate: 2,
    reward_currency: 'miles',
    category_rates: { hotels_cars_capital_one_portal: 10, flights_capital_one_portal: 5 },
    category_caps: {},
    is_business: false,
  },
  // Card 16
  {
    card_name: 'Capital One Venture',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 2,
    reward_currency: 'miles',
    category_rates: { hotels_cars_capital_one_portal: 5 },
    category_caps: {},
    is_business: false,
  },
  // Card 17
  {
    card_name: 'Capital One SavorOne',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { dining: 3, entertainment: 3, streaming: 3, grocery: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 18
  {
    card_name: 'Capital One Quicksilver',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 19
  {
    card_name: 'Citi Double Cash',
    issuer: 'Citi',
    network: 'Mastercard',
    annual_fee_cents: 0,
    base_rate: 2,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 20
  {
    card_name: 'Citi Custom Cash',
    issuer: 'Citi',
    network: 'Mastercard',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { top_spending_category: 5 },
    category_caps: { top_spending_category: { cap_cents: 50000, period: 'monthly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 21
  {
    card_name: 'Citi Premier',
    issuer: 'Citi',
    network: 'Mastercard',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { airlines: 3, hotels: 3, dining: 3, grocery: 3, gas: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 22
  {
    card_name: 'Discover it Cash Back',
    issuer: 'Discover',
    network: 'Discover',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { rotating_quarterly: 5 },
    category_caps: { rotating_quarterly: { cap_cents: 150000, period: 'quarterly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 23
  {
    card_name: 'Discover it Miles',
    issuer: 'Discover',
    network: 'Discover',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'miles',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 24
  {
    card_name: 'Wells Fargo Active Cash',
    issuer: 'Wells Fargo',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 2,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 25
  {
    card_name: 'Wells Fargo Autograph',
    issuer: 'Wells Fargo',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { dining: 3, travel: 3, gas: 3, transit: 3, streaming: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 26
  {
    card_name: 'US Bank Altitude Go',
    issuer: 'US Bank',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { dining: 4, grocery: 2, streaming: 2, gas: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 27
  {
    card_name: 'Bank of America Customized Cash',
    issuer: 'Bank of America',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { choice_category: 3, grocery: 2, wholesale: 2 },
    category_caps: { choice_category: { cap_cents: 250000, period: 'quarterly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 28
  {
    card_name: 'Bank of America Unlimited Cash',
    issuer: 'Bank of America',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 29
  {
    card_name: 'Apple Card',
    issuer: 'Goldman Sachs',
    network: 'Mastercard',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { apple: 3, uber: 3, tmobile: 3, apple_pay: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 30
  {
    card_name: 'PayPal Cashback Mastercard',
    issuer: 'Synchrony',
    network: 'Mastercard',
    annual_fee_cents: 0,
    base_rate: 2,
    reward_currency: 'cashback_percent',
    category_rates: { paypal: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 31
  {
    card_name: 'Chase Ink Business Cash',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { office_supplies: 5, internet_phone: 5, gas: 2, dining: 2 },
    category_caps: { 'office_supplies+internet_phone': { cap_cents: 2500000, period: 'annual', fallback_rate: 1 } },
    is_business: true,
  },
  // Card 32
  {
    card_name: 'Chase Ink Business Unlimited',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: true,
  },
  // Card 33
  {
    card_name: 'IHG One Rewards Premier',
    issuer: 'Chase',
    network: 'Mastercard',
    annual_fee_cents: 9900,
    base_rate: 3,
    reward_currency: 'points',
    category_rates: { ihg_hotels: 26, travel: 5, dining: 5, gas: 5 },
    category_caps: {},
    is_business: false,
  },
  // Card 34
  {
    card_name: 'World of Hyatt',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { hyatt_hotels: 9, dining: 2, fitness: 2, transit: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 35
  {
    card_name: 'Hilton Honors Surpass',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 15000,
    base_rate: 3,
    reward_currency: 'points',
    category_rates: { hilton_hotels: 12, dining: 6, grocery: 6, gas: 6 },
    category_caps: {},
    is_business: false,
  },
  // Card 36
  {
    card_name: 'Hilton Honors',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 0,
    base_rate: 3,
    reward_currency: 'points',
    category_rates: { hilton_hotels: 7, dining: 5, grocery: 5, gas: 5 },
    category_caps: {},
    is_business: false,
  },
  // Card 37
  {
    card_name: 'Delta SkyMiles Platinum',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 35000,
    base_rate: 1,
    reward_currency: 'miles',
    category_rates: { delta_airlines: 3, hotels: 3, dining: 2, grocery: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 38
  {
    card_name: 'Amex Business Gold',
    issuer: 'American Express',
    network: 'Amex',
    annual_fee_cents: 37500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { top_2_categories: 4 },
    category_caps: { top_2_categories: { cap_cents: 15000000, period: 'annual', fallback_rate: 1 } },
    is_business: true,
  },
  // Card 39
  {
    card_name: 'Capital One Savor',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { dining: 4, entertainment: 4, grocery: 3, streaming: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 40
  {
    card_name: 'Capital One Spark Cash Plus',
    issuer: 'Capital One',
    network: 'Visa',
    annual_fee_cents: 15000,
    base_rate: 2,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: true,
  },
  // Card 41
  {
    card_name: 'Citi Strata Premier',
    issuer: 'Citi',
    network: 'Mastercard',
    annual_fee_cents: 9500,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { airlines: 3, hotels: 3, dining: 3, grocery: 3, gas: 3, ev_charging: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 42
  {
    card_name: 'AAdvantage Platinum Select',
    issuer: 'Citi',
    network: 'Mastercard',
    annual_fee_cents: 9900,
    base_rate: 1,
    reward_currency: 'miles',
    category_rates: { american_airlines: 2, hotels: 2, dining: 2, gas: 2 },
    category_caps: {},
    is_business: false,
  },
  // Card 43
  {
    card_name: 'US Bank Altitude Reserve',
    issuer: 'US Bank',
    network: 'Visa',
    annual_fee_cents: 40000,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { travel: 3, mobile_wallet: 3 },
    category_caps: {},
    is_business: false,
  },
  // Card 44
  {
    card_name: 'US Bank Cash+',
    issuer: 'US Bank',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { choice_category_1: 5, choice_category_2: 5, choice_category_3: 2 },
    category_caps: { 'choice_category_1+choice_category_2': { cap_cents: 200000, period: 'quarterly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 45
  {
    card_name: 'Discover it Chrome',
    issuer: 'Discover',
    network: 'Discover',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { gas: 2, dining: 2 },
    category_caps: { 'gas+dining': { cap_cents: 100000, period: 'quarterly', fallback_rate: 1 } },
    is_business: false,
  },
  // Card 46
  {
    card_name: 'Bilt Mastercard',
    issuer: 'Wells Fargo',
    network: 'Mastercard',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'points',
    category_rates: { dining: 3, travel: 2, rent: 1 },
    category_caps: {},
    is_business: false,
  },
  // Card 47
  {
    card_name: 'Alliant Cashback Visa',
    issuer: 'Alliant Credit Union',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 2.5,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 48
  {
    card_name: 'USAA Preferred Cash Rewards',
    issuer: 'USAA',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1.5,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 49
  {
    card_name: 'PenFed Power Cash Rewards',
    issuer: 'PenFed',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 2,
    reward_currency: 'cashback_percent',
    category_rates: {},
    category_caps: {},
    is_business: false,
  },
  // Card 50
  {
    card_name: 'Amazon Prime Visa',
    issuer: 'Chase',
    network: 'Visa',
    annual_fee_cents: 0,
    base_rate: 1,
    reward_currency: 'cashback_percent',
    category_rates: { amazon: 5, whole_foods: 5, dining: 2, gas: 2, transit: 2 },
    category_caps: {},
    is_business: false,
  },
]

const MERCHANT_CATEGORIES = [
  { merchant_name: 'Amazon', category: 'general_retail' },
  { merchant_name: 'Target', category: 'general_retail' },
  { merchant_name: 'Walmart', category: 'general_retail' },
  { merchant_name: 'Best Buy', category: 'general_retail' },
  { merchant_name: 'Home Depot', category: 'home_improvement' },
  { merchant_name: "Lowe's", category: 'home_improvement' },
  { merchant_name: 'Costco', category: 'wholesale' },
  { merchant_name: "Sam's Club", category: 'wholesale' },
  { merchant_name: "Macy's", category: 'general_retail' },
  { merchant_name: 'Nordstrom', category: 'general_retail' },
  { merchant_name: 'Nike', category: 'general_retail' },
  { merchant_name: 'Adidas', category: 'general_retail' },
  { merchant_name: 'Apple', category: 'general_retail' },
  { merchant_name: 'Sephora', category: 'general_retail' },
  { merchant_name: 'Ulta', category: 'general_retail' },
  { merchant_name: 'Whole Foods', category: 'grocery' },
  { merchant_name: 'Kroger', category: 'grocery' },
  { merchant_name: 'Albertsons', category: 'grocery' },
  { merchant_name: 'Publix', category: 'grocery' },
  { merchant_name: "Trader Joe's", category: 'grocery' },
]

async function main() {
  console.log('=== Seeding credit_cards ===\n')

  // Insert in batches of 5
  const batchSize = 5
  let totalInserted = 0

  for (let i = 0; i < CREDIT_CARDS.length; i += batchSize) {
    const batch = CREDIT_CARDS.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('credit_cards')
      .insert(batch)
      .select('id, card_name')

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message)
    } else {
      const names = (data ?? []).map((r: { card_name: string }) => r.card_name).join(', ')
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${names}`)
      totalInserted += (data ?? []).length
    }
  }

  console.log(`\n✅ Total credit cards seeded: ${totalInserted}`)

  console.log('\n=== Seeding merchant_categories ===\n')

  const { data: mcData, error: mcError } = await supabase
    .from('merchant_categories')
    .upsert(MERCHANT_CATEGORIES, { onConflict: 'merchant_name' })
    .select('id, merchant_name')

  if (mcError) {
    console.error('❌ merchant_categories error:', mcError.message)
  } else {
    console.log(`✅ Merchant categories seeded: ${(mcData ?? []).length}`)
    ;(mcData ?? []).forEach((r: { merchant_name: string }) => console.log(`  - ${r.merchant_name}`))
  }

  console.log('\n=== Done ===')
}

main().catch(console.error)
