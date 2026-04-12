-- Anonymous usage tracking — run this in Supabase SQL editor
-- https://supabase.com/dashboard/project/csvroqepkikmbqyblscc/sql/new

create table if not exists public.anon_usage (
  fingerprint text not null,
  date date not null,
  count integer default 0 not null,
  primary key (fingerprint, date)
);

-- No RLS — service role only, no user access needed
alter table public.anon_usage disable row level security;
