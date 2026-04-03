-- Add PayPal-specific columns to payouts table
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paypal_batch_id text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS paypal_item_id text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS destination text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS destination_type text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transaction_ids uuid[];
