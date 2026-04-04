-- Migration: Create credit_cards, update user_cards, and merchant_categories tables
-- for the credit card rewards database feature

-- ============================================================
-- credit_cards
-- ============================================================
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
);

-- ============================================================
-- user_cards (new table for credit_cards rewards system)
-- Note: existing user_cards table references the old 'cards' table
-- We create a new table credit_card_selections for the new system
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_card_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id uuid REFERENCES credit_cards(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- ============================================================
-- merchant_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(merchant_name)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Policies
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read credit cards' AND tablename = 'credit_cards'
  ) THEN
    CREATE POLICY "Anyone can read credit cards" ON credit_cards FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own credit card selections' AND tablename = 'credit_card_selections'
  ) THEN
    CREATE POLICY "Users can read own credit card selections" ON credit_card_selections FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own credit card selections' AND tablename = 'credit_card_selections'
  ) THEN
    CREATE POLICY "Users can insert own credit card selections" ON credit_card_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own credit card selections' AND tablename = 'credit_card_selections'
  ) THEN
    CREATE POLICY "Users can update own credit card selections" ON credit_card_selections FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own credit card selections' AND tablename = 'credit_card_selections'
  ) THEN
    CREATE POLICY "Users can delete own credit card selections" ON credit_card_selections FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read merchant categories' AND tablename = 'merchant_categories'
  ) THEN
    CREATE POLICY "Anyone can read merchant categories" ON merchant_categories FOR SELECT USING (true);
  END IF;
END $$;
