-- ============================================================
-- Tamarind Business Tracker — Supabase Schema
-- Run this in Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ============================================================
-- PARTIES
-- ============================================================
create table if not exists parties (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  type       text not null check (type in ('customer', 'supplier')),
  phone      text,
  notes      text,
  deleted    boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- PURCHASES
-- ============================================================
create table if not exists purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  party_id     uuid references parties(id),
  seed_type    text,
  quantity     numeric(12,3) default 0,
  rate         numeric(12,2) default 0,
  total        numeric(12,2) default 0,
  paid_amount  numeric(12,2) default 0,
  pending      numeric(12,2) default 0,
  due_date     date,
  notes        text,
  deleted      boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- SALES
-- ============================================================
create table if not exists sales (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  party_id         uuid references parties(id),
  product          text,
  quantity         numeric(12,3) default 0,
  rate             numeric(12,2) default 0,
  total            numeric(12,2) default 0,
  received_amount  numeric(12,2) default 0,
  pending          numeric(12,2) default 0,
  due_date         date,
  notes            text,
  deleted          boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  category   text not null,
  amount     numeric(12,2) default 0,
  date       date not null,
  notes      text,
  deleted    boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Each user sees only their own data
-- ============================================================
alter table parties   enable row level security;
alter table purchases enable row level security;
alter table sales     enable row level security;
alter table expenses  enable row level security;

-- Policies: user can only access their own rows
create policy "parties_own"   on parties   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "purchases_own" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sales_own"     on sales     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own"  on expenses  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_parties_user   on parties(user_id);
create index if not exists idx_purchases_user on purchases(user_id);
create index if not exists idx_purchases_date on purchases(created_at);
create index if not exists idx_sales_user     on sales(user_id);
create index if not exists idx_sales_date     on sales(created_at);
create index if not exists idx_expenses_user  on expenses(user_id);
create index if not exists idx_expenses_date  on expenses(date);
