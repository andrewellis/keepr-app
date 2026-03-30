create table if not exists anon_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  last_seen timestamptz,
  scan_count int not null default 0
);

alter table anon_sessions disable row level security;
