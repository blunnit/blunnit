-- ═══════════════════════════════════════════════════════════
-- BLUNNIT Database Schema
-- Run this in Supabase SQL Editor (supabase.com > SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  tier text default 'free' check (tier in ('free', 'paid')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  confrontation_level text default 'clear' check (confrontation_level in ('gentle', 'clear', 'piercing')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages within conversations
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  confrontation_level text check (confrontation_level in ('gentle', 'clear', 'piercing')),
  created_at timestamptz default now()
);

-- Reflection count tracking (for free tier limits)
create table public.reflection_counts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start date not null,
  count integer default 0,
  unique (user_id, week_start)
);

-- Row Level Security (critical for privacy)
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reflection_counts enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can create own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

create policy "Users can view own messages"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "Users can create own messages"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "Users can view own reflection counts"
  on public.reflection_counts for select
  using (auth.uid() = user_id);

create policy "Users can update own reflection counts"
  on public.reflection_counts for all
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Index for performance
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_reflection_counts_user_week on public.reflection_counts(user_id, week_start);

-- User themes for memory layer (paid users only)
create table public.user_themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  theme text not null,
  count integer default 1 not null,
  last_seen timestamptz default now() not null,
  constraint user_themes_user_theme_unique unique (user_id, theme)
);

alter table public.user_themes enable row level security;

create policy "Users can manage their own themes"
  on public.user_themes for all
  using (auth.uid() = user_id);

create index idx_user_themes_user_count on public.user_themes(user_id, count desc);

-- Daily presence counter (public aggregate, no RLS)
create table public.daily_presence (
  date date primary key,
  count integer default 0 not null
);
