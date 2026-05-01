-- =====================================================================
-- SkorAI — Supabase Schema
-- =====================================================================
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → paste → Run
-- Pastikan extension yang dibutuhkan aktif (default sudah aktif di Supabase).
-- =====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. PROFILES — extends auth.users (Supabase Auth handle password)
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  name         text not null,
  phone        text,
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  -- Initialize wallet kosong (NO welcome bonus per kebijakan launch).
  -- User wajib top-up sebelum pakai paid features. Beta = semua tools gratis,
  -- tapi tidak via bonus melainkan via flag BETA_FREE di frontend.
  insert into public.wallets (user_id, balance, bonus)
  values (new.id, 0, 0);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2. WALLETS — saldo user (1 row per user)
-- =====================================================================
create table public.wallets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  balance      bigint not null default 0 check (balance >= 0),  -- saldo utama (Rupiah)
  bonus        bigint not null default 0 check (bonus >= 0),    -- saldo bonus
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- 3. WALLET_TRANSACTIONS — ledger semua mutasi saldo (audit trail)
-- =====================================================================
create table public.wallet_transactions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('topup','payment','refund','welcome','bonus','adjustment')),
  amount       bigint not null,        -- + masuk, - keluar (saldo utama)
  bonus        bigint not null default 0,
  note         text,
  reference_id text,                   -- order_id atau midtrans_order_id
  created_at   timestamptz not null default now()
);

create index idx_wallet_tx_user on public.wallet_transactions(user_id, created_at desc);

-- =====================================================================
-- 4. ORDERS — pesanan service (assessment / statistik)
-- =====================================================================
create table public.orders (
  id              text primary key,                -- ORD-XXXXXX (human readable)
  user_id         uuid not null references auth.users(id) on delete cascade,
  service         text not null check (service in ('assessment','statistics')),
  tier            text not null,                   -- pendek/sedang/panjang/dasar/lanjutan
  amount          bigint not null check (amount >= 0),
  status          text not null default 'pending'
                  check (status in ('pending','processing','completed','failed','refunded')),
  payment_method  text,                            -- wallet, qris, midtrans, etc
  midtrans_order_id text,                          -- referensi gateway
  paid_at         timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_orders_user on public.orders(user_id, created_at desc);
create index idx_orders_status on public.orders(status);

-- =====================================================================
-- 5. ASSESSMENTS — hasil penilaian AI (1 order bisa multi siswa)
-- =====================================================================
create table public.assessments (
  id           uuid primary key default uuid_generate_v4(),
  order_id     text not null references public.orders(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  rubrik       jsonb not null,           -- snapshot rubrik saat assess
  jawaban      text not null,            -- jawaban siswa
  scores       jsonb not null,           -- {kriteria_id: {skor, komentar}}
  total_score  numeric(4,2),             -- 0.00 - 10.00
  kesimpulan   text,
  ai_provider  text,                     -- 'groq' | 'kimi'
  ai_tokens    integer,                  -- untuk tracking biaya
  created_at   timestamptz not null default now()
);

create index idx_assessments_order on public.assessments(order_id);
create index idx_assessments_user on public.assessments(user_id, created_at desc);

-- =====================================================================
-- 6. RUBRICS — rubrik tersimpan (reusable per user)
-- =====================================================================
create table public.rubrics (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  criteria    jsonb not null,            -- [{id,name,weight,description}]
  is_template boolean default false,     -- admin-curated template
  created_at  timestamptz not null default now()
);

create index idx_rubrics_user on public.rubrics(user_id);

-- =====================================================================
-- 7. PAYMENT_INTENTS — tracking Midtrans transactions (idempotency)
-- =====================================================================
create table public.payment_intents (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  midtrans_order_id text unique not null,
  amount            bigint not null check (amount > 0),
  status            text not null default 'pending'
                    check (status in ('pending','settlement','capture','deny','expire','cancel','failure')),
  raw_response      jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =====================================================================
-- 7b. SAVED_ANALYSES — riwayat hasil analisis statistik per user
-- =====================================================================
create table public.saved_analyses (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,                         -- nama custom dari user
  tool          text not null,                         -- 'descriptive', 'ttest', dll
  tool_name     text not null,                         -- display name
  result_type   text not null,                         -- result.type
  sample_size   integer,                               -- jumlah data
  result        jsonb not null,                        -- full result object
  ai_interpretation text,                              -- AI interpretation jika sempat di-generate
  notes         text,                                  -- catatan personal user
  created_at    timestamptz not null default now()
);

create index idx_saved_analyses_user on public.saved_analyses(user_id, created_at desc);
create index idx_saved_analyses_tool on public.saved_analyses(tool);

-- =====================================================================
-- 8. RPC: deduct_wallet_atomic — potong saldo + create order atomic
-- =====================================================================
create or replace function public.deduct_wallet_and_create_order(
  p_order_id text,
  p_service text,
  p_tier text,
  p_amount bigint,
  p_payment_method text default 'wallet'
)
returns public.orders
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet record;
  v_to_deduct bigint := p_amount;
  v_use_bonus bigint := 0;
  v_use_balance bigint := 0;
  v_order public.orders;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Lock wallet row
  select * into v_wallet from public.wallets where user_id = v_user_id for update;

  if (v_wallet.balance + v_wallet.bonus) < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  -- Use bonus first
  if v_wallet.bonus >= v_to_deduct then
    v_use_bonus := v_to_deduct;
    v_to_deduct := 0;
  else
    v_use_bonus := v_wallet.bonus;
    v_to_deduct := v_to_deduct - v_wallet.bonus;
  end if;

  v_use_balance := v_to_deduct;

  update public.wallets
    set balance = balance - v_use_balance,
        bonus = bonus - v_use_bonus,
        updated_at = now()
    where user_id = v_user_id;

  insert into public.wallet_transactions(user_id, type, amount, bonus, note, reference_id)
  values (v_user_id, 'payment', -v_use_balance, -v_use_bonus, 'Bayar order ' || p_order_id, p_order_id);

  insert into public.orders(id, user_id, service, tier, amount, status, payment_method, paid_at)
  values (p_order_id, v_user_id, p_service, p_tier, p_amount, 'processing', p_payment_method, now())
  returning * into v_order;

  return v_order;
end;
$$;

-- =====================================================================
-- 9. RPC: top_up_wallet — dipanggil dari webhook Midtrans (server only)
-- =====================================================================
create or replace function public.top_up_wallet(
  p_user_id uuid,
  p_amount bigint,
  p_reference_id text
)
returns void
language plpgsql
security definer
as $$
declare
  v_bonus bigint := 0;
begin
  -- Bonus tier
  if p_amount >= 100000 then v_bonus := (p_amount * 20 / 100);
  elsif p_amount >= 50000 then v_bonus := (p_amount * 10 / 100);
  elsif p_amount >= 25000 then v_bonus := (p_amount * 5 / 100);
  end if;

  update public.wallets
    set balance = balance + p_amount,
        bonus = bonus + v_bonus,
        updated_at = now()
    where user_id = p_user_id;

  insert into public.wallet_transactions(user_id, type, amount, bonus, note, reference_id)
  values (p_user_id, 'topup', p_amount, v_bonus, 'Top-up via payment gateway', p_reference_id);
end;
$$;

-- =====================================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.wallets             enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.orders              enable row level security;
alter table public.assessments         enable row level security;
alter table public.rubrics             enable row level security;
alter table public.payment_intents     enable row level security;
alter table public.saved_analyses      enable row level security;

-- Helper: cek role admin
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

-- profiles: user lihat & edit dirinya, admin lihat semua
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- wallets: user lihat dirinya, admin lihat semua. Update HANYA via RPC (security definer).
create policy "wallets_self_select" on public.wallets
  for select using (auth.uid() = user_id or public.is_admin());

-- wallet_transactions: user lihat history-nya
create policy "wallet_tx_self_select" on public.wallet_transactions
  for select using (auth.uid() = user_id or public.is_admin());

-- orders: user lihat & insert orders-nya sendiri (insert sebenarnya via RPC, tapi backup)
create policy "orders_self_select" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

-- assessments: user lihat hasilnya sendiri. Insert HANYA dari server (service role)
create policy "assessments_self_select" on public.assessments
  for select using (auth.uid() = user_id or public.is_admin());

-- rubrics: user CRUD rubriknya sendiri + bisa baca template
create policy "rubrics_self_all" on public.rubrics
  for all using (auth.uid() = user_id or is_template = true);

-- payment_intents: user lihat dirinya
create policy "payment_intents_self_select" on public.payment_intents
  for select using (auth.uid() = user_id or public.is_admin());

-- saved_analyses: user CRUD penuh untuk row-nya sendiri (admin baca semua)
create policy "saved_analyses_self_select" on public.saved_analyses
  for select using (auth.uid() = user_id or public.is_admin());
create policy "saved_analyses_self_insert" on public.saved_analyses
  for insert with check (auth.uid() = user_id);
create policy "saved_analyses_self_update" on public.saved_analyses
  for update using (auth.uid() = user_id);
create policy "saved_analyses_self_delete" on public.saved_analyses
  for delete using (auth.uid() = user_id);
