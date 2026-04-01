-- Migration: Create cards, card_category_rates, and user_cards tables
-- for the credit card cashback optimizer feature

-- ============================================================
-- cards
-- ============================================================
create table if not exists cards (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  issuer                text not null,
  network               text not null check (network in ('Visa', 'Mastercard', 'Amex', 'Discover')),
  base_rate             numeric(4,2) not null,
  has_rotating_categories boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- card_category_rates
-- ============================================================
create table if not exists card_category_rates (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid references cards(id) on delete cascade,
  category   text not null check (
    category in (
      'online_shopping',
      'groceries',
      'dining',
      'travel',
      'gas',
      'drugstore',
      'home_improvement',
      'entertainment',
      'electronics',
      'clothing_apparel',
      'fitness_sports',
      'other'
    )
  ),
  rate       numeric(4,2) not null,
  is_rotating boolean not null default false,
  notes      text,
  constraint card_category_rates_card_id_category_key unique (card_id, category)
);

-- ============================================================
-- user_cards
-- ============================================================
create table if not exists user_cards (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references auth.users(id) on delete cascade,
  card_id  uuid references cards(id) on delete cascade,
  added_at timestamptz default now(),
  constraint user_cards_user_id_card_id_key unique (user_id, card_id)
);

-- Enable RLS on user_cards
alter table user_cards enable row level security;

-- RLS policies for user_cards
create policy "user_cards_select"
  on user_cards for select
  using (user_id = auth.uid());

create policy "user_cards_insert"
  on user_cards for insert
  with check (user_id = auth.uid());

create policy "user_cards_delete"
  on user_cards for delete
  using (user_id = auth.uid());
