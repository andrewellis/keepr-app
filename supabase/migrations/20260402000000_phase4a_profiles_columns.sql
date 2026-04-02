-- ============================================================
-- Phase 4A: Add new columns to profiles table
-- ============================================================

-- invite_code: stores the beta invite code used at signup
alter table public.profiles
  add column if not exists invite_code text;

-- payout_destination: PayPal email or Venmo phone number
alter table public.profiles
  add column if not exists payout_destination text;

-- payout_destination_type: 'email' or 'phone'
alter table public.profiles
  add column if not exists payout_destination_type text
  check (payout_destination_type in ('email', 'phone'));

-- payout_balance_cents: accumulated unpaid balance
alter table public.profiles
  add column if not exists payout_balance_cents integer not null default 0;

-- annual_cash_payout_cents: total paid out this year (for W-9 threshold tracking)
alter table public.profiles
  add column if not exists annual_cash_payout_cents integer not null default 0;

-- annual_cash_payout_year: the year the annual total applies to
alter table public.profiles
  add column if not exists annual_cash_payout_year integer not null
  default extract(year from now())::integer;

-- w9_required: flag set by admin when user crosses $600 threshold
alter table public.profiles
  add column if not exists w9_required boolean not null default false;

-- w9_on_file: flag set by admin when W-9 has been received
alter table public.profiles
  add column if not exists w9_on_file boolean not null default false;
