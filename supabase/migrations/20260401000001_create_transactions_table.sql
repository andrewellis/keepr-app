create table if not exists transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
  product_name       text,
  category           text,
  scan_image_url     text,
  retailer           text,
  affiliate_url      text,
  affiliate_rate     numeric(5,4),
  user_payout_cents  integer,
  status             text not null default 'scanned' check (status in ('scanned', 'clicked', 'pending', 'confirmed', 'paid')),
  created_at         timestamptz default now()
);

alter table transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'transactions_select' and tablename = 'transactions') then
    create policy "transactions_select"
      on transactions for select
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'transactions_insert' and tablename = 'transactions') then
    create policy "transactions_insert"
      on transactions for insert
      with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'transactions_update' and tablename = 'transactions') then
    create policy "transactions_update"
      on transactions for update
      using (user_id = auth.uid());
  end if;
end $$;
