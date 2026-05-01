-- =====================================================================
-- Migration 002: Saved Analyses
-- =====================================================================
-- Untuk user yang sudah deploy schema.sql sebelum fitur ini ada.
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- Idempotent: aman dijalankan ulang.
-- =====================================================================

-- Table
create table if not exists public.saved_analyses (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  tool          text not null,
  tool_name     text not null,
  result_type   text not null,
  sample_size   integer,
  result        jsonb not null,
  ai_interpretation text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_saved_analyses_user
  on public.saved_analyses(user_id, created_at desc);
create index if not exists idx_saved_analyses_tool
  on public.saved_analyses(tool);

-- RLS
alter table public.saved_analyses enable row level security;

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
