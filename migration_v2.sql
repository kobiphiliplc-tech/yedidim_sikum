-- ============================================================
-- ידידים דוד — Migration v2
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run on existing DB (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. Add alias column to categories (short name used in pasted text)
alter table categories add column if not exists alias text;

-- 2. Expand type constraint to include 'extra'
alter table categories drop constraint if exists categories_type_check;
alter table categories add constraint categories_type_check
  check (type in ('emergency', 'regular', 'extra'));

-- 3. Add incident_id to events (groups volunteers from the same call)
alter table events add column if not exists incident_id uuid;

-- 4. Expand source_type constraint to include 'extra'
alter table events drop constraint if exists events_source_type_check;
alter table events add constraint events_source_type_check
  check (source_type in ('emergency', 'regular', 'extra'));

-- 5. Settings table (header/footer templates)
create table if not exists settings (
  key   text primary key,
  value text not null default ''
);

alter table settings enable row level security;

drop policy if exists "anon full access" on settings;
create policy "anon full access" on settings
  for all to anon using (true) with check (true);

insert into settings (key, value) values
  ('header_template', ''),
  ('footer_template', '')
on conflict (key) do nothing;

-- 6. Seed alias for מעלית → לכודים במעלית
update categories set alias = 'מעלית' where name = 'לכודים במעלית';

-- 7. Seed extra categories (שאיבה, משיכה)
insert into categories (name, type) values
  ('שאיבה', 'extra'),
  ('משיכה', 'extra')
on conflict (name) do nothing;
