-- ============================================================
-- Phase 4A: Add Click ID tracking columns to transactions table
-- ============================================================
-- Strategy: Add click_id as NULLABLE first, backfill existing rows
-- with placeholder IDs, then alter to NOT NULL.
-- ============================================================

-- Step 1: Add all new columns as nullable initially
alter table public.transactions
  add column if not exists click_id varchar(50);

alter table public.transactions
  add column if not exists affiliate_network varchar(50);

alter table public.transactions
  add column if not exists link_url text;

alter table public.transactions
  add column if not exists created_ip varchar(45);

alter table public.transactions
  add column if not exists user_agent text;

alter table public.transactions
  add column if not exists purchase_amount decimal(10,2);

alter table public.transactions
  add column if not exists commission_status varchar(20) default 'unconfirmed';

alter table public.transactions
  add column if not exists payout_held_until timestamptz;

alter table public.transactions
  add column if not exists payout_hold_released boolean default false;

-- Step 2: Backfill existing rows that have NULL click_id
-- Uses format K3P-LEGACY-{id}-{6 hex chars from id}
update public.transactions
set
  click_id = 'K3P-LEGACY-' || substr(id::text, 1, 8) || '-' || substr(md5(id::text), 1, 6),
  link_url = coalesce(affiliate_url, 'https://k33pr.com'),
  created_ip = '0.0.0.0',
  user_agent = 'legacy-backfill'
where click_id is null;

-- Step 3: Add NOT NULL constraints now that all rows are backfilled
alter table public.transactions
  alter column click_id set not null;

alter table public.transactions
  alter column link_url set not null;

alter table public.transactions
  alter column created_ip set not null;

alter table public.transactions
  alter column user_agent set not null;

-- Step 4: Add UNIQUE constraint on click_id
alter table public.transactions
  add constraint if not exists transactions_click_id_unique unique (click_id);

-- Step 5: Create index for fast click_id lookups
create index if not exists idx_transactions_click_id on public.transactions(click_id);
