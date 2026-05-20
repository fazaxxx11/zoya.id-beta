-- =====================================================================
-- Migration 004: Align top_up_wallet bonus formula with UI
-- =====================================================================
-- Untuk instance Supabase yang sudah deploy schema.sql versi awal (5/10/20%
-- tier bonus). UI di src/lib/pricing.js + src/lib/wallet.js memberi 100% bonus
-- (cap Rp 250.000) untuk top-up ≥ Rp 25.000, jadi DB harus disesuaikan.
--
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- Idempotent: aman dijalankan ulang.
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
  -- Bonus tier (sinkron dengan calcTopUpBonus() di src/lib/wallet.js):
  --   < Rp 25.000  → 0
  --   ≥ Rp 25.000  → 100% (capped at Rp 250.000)
  if p_amount >= 25000 then
    v_bonus := least(p_amount, 250000);
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
