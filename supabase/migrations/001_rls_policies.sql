-- =====================================================================
-- Migration 001: Row Level Security (RLS) Policies
-- =====================================================================
-- Idempotent: safe to run multiple times. Uses DROP POLICY IF EXISTS
-- before creating policies, and creates the is_admin() helper if missing.
--
-- Run via: Supabase Dashboard → SQL Editor → paste → Run
-- Or: supabase db push (if linked)
-- =====================================================================

-- ─── Helper: is_admin() ────────────────────────────────────────────
-- Returns true if the authenticated user has role = 'admin' in profiles.
-- Used by all RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Enable RLS on all tables ─────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.orders              enable row level security;
alter table public.assessments         enable row level security;
alter table public.rubrics             enable row level security;
alter table public.payment_intents     enable row level security;
alter table public.saved_analyses      enable row level security;

-- ─── PROFILES ─────────────────────────────────────────────────────
-- Users can read and update their own profile.
-- Admins can read all profiles (for user management).
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- ─── WALLETS ──────────────────────────────────────────────────────
-- Users can read their own wallet.
-- Admins can read all wallets (for admin dashboard).
-- Wallet updates ONLY via RPC (security definer functions).
drop policy if exists "wallets_self_select" on public.wallets;

create policy "wallets_self_select" on public.wallets
  for select using (auth.uid() = user_id or public.is_admin());

-- ─── WALLET_TRANSACTIONS ──────────────────────────────────────────
-- Users can read their own transaction history.
-- Admins can read all transactions.
drop policy if exists "wallet_tx_self_select" on public.wallet_transactions;

create policy "wallet_tx_self_select" on public.wallet_transactions
  for select using (auth.uid() = user_id or public.is_admin());

-- ─── ORDERS ───────────────────────────────────────────────────────
-- Users can read their own orders.
-- Admins can read all orders (for admin dashboard).
drop policy if exists "orders_self_select" on public.orders;

create policy "orders_self_select" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

-- ─── ASSESSMENTS ──────────────────────────────────────────────────
-- Users can read their own assessment results.
-- Admins can read all assessments.
drop policy if exists "assessments_self_select" on public.assessments;

create policy "assessments_self_select" on public.assessments
  for select using (auth.uid() = user_id or public.is_admin());

-- ─── RUBRICS ──────────────────────────────────────────────────────
-- Users can CRUD their own rubrics. Public templates (is_template=true) are readable by all.
drop policy if exists "rubrics_self_all" on public.rubrics;

create policy "rubrics_self_all" on public.rubrics
  for all using (auth.uid() = user_id or is_template = true);

-- ─── PAYMENT_INTENTS ──────────────────────────────────────────────
-- Users can read their own payment intents.
-- Admins can read all payment intents.
drop policy if exists "payment_intents_self_select" on public.payment_intents;

create policy "payment_intents_self_select" on public.payment_intents
  for select using (auth.uid() = user_id or public.is_admin());

-- ─── SAVED_ANALYSES ───────────────────────────────────────────────
-- Users can CRUD their own saved analyses.
-- Admins can read all saved analyses.
drop policy if exists "saved_analyses_self_select" on public.saved_analyses;
drop policy if exists "saved_analyses_self_insert" on public.saved_analyses;
drop policy if exists "saved_analyses_self_update" on public.saved_analyses;
drop policy if exists "saved_analyses_self_delete" on public.saved_analyses;

create policy "saved_analyses_self_select" on public.saved_analyses
  for select using (auth.uid() = user_id or public.is_admin());

create policy "saved_analyses_self_insert" on public.saved_analyses
  for insert with check (auth.uid() = user_id);

create policy "saved_analyses_self_update" on public.saved_analyses
  for update using (auth.uid() = user_id);

create policy "saved_analyses_self_delete" on public.saved_analyses
  for delete using (auth.uid() = user_id);
