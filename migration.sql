-- ============================================================
-- ידידים דוד — Supabase Schema + Seed
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. weeks table
create table if not exists weeks (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  status     text not null default 'active'
    check (status in ('active', 'closed'))
);

-- 2. categories table
create table if not exists categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null
    check (type in ('emergency', 'regular'))
);

-- 3. events table
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null references weeks(id) on delete cascade,
  category       text not null,
  volunteer_name text not null,
  count          integer not null default 1 check (count > 0),
  source_type    text not null
    check (source_type in ('emergency', 'regular')),
  created_at     timestamptz default now()
);

-- 4. Indexes
create index if not exists events_week_id_idx     on events(week_id);
create index if not exists events_source_type_idx on events(source_type);
create index if not exists weeks_status_idx       on weeks(status);

-- 5. RLS — no auth, anon full access
-- WARNING: All data is accessible to anyone with the anon key.
-- For internal/intranet use only.
alter table weeks      enable row level security;
alter table categories enable row level security;
alter table events     enable row level security;

drop policy if exists "anon full access" on weeks;
create policy "anon full access" on weeks
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on categories;
create policy "anon full access" on categories
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on events;
create policy "anon full access" on events
  for all to anon using (true) with check (true);

-- 6. Seed: emergency categories
-- Names must match EXACTLY what appears in pasted emergency reports.
-- Add or remove as needed via the CategoryManager UI after setup.
insert into categories (name, type) values
  ('לכודים במעלית',       'emergency'),
  ('ילד נעול בממ"ד',      'emergency'),
  ('הרמת מבוגר מהרצפה',   'emergency'),
  ('חילוץ טבעת מאצבע',    'emergency')
on conflict (name) do nothing;

-- 7. Create initial active week so the app is usable immediately
insert into weeks (status) values ('active');
