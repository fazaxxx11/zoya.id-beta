-- =====================================================
-- SECURITY FIX: 2026-06-09
-- Run once di Supabase SQL Editor
-- https://supabase.com/dashboard/project/fjndhdlulzvdfmdyelit/sql/new
-- =====================================================

-- 1. Fix top_up_wallet: ADMIN ONLY + bonus logic
CREATE OR REPLACE FUNCTION public.top_up_wallet(
  p_user_id uuid,
  p_amount bigint,
  p_reference_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  v_bonus bigint := 0;
BEGIN
  -- Only admin can top up
  SELECT (role = 'admin') INTO caller_is_admin
  FROM profiles WHERE id = auth.uid();
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only admins can top up wallets';
  END IF;

  -- Bonus: >= Rp 25.000 -> 100% (cap Rp 250.000)
  IF p_amount >= 25000 THEN
    v_bonus := least(p_amount, 250000);
  END IF;

  UPDATE public.wallets
    SET balance = balance + p_amount,
        bonus = bonus + v_bonus,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions(user_id, type, amount, bonus, note, reference_id)
  VALUES (p_user_id, 'topup', p_amount, v_bonus, 'Top-up via admin', p_reference_id);
END;
$$;

-- 2. Grant only to authenticated (NOT anon)
GRANT EXECUTE ON FUNCTION top_up_wallet(uuid, bigint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION top_up_wallet(uuid, bigint, text) FROM anon, public;

-- 3. Fix deduct_wallet_and_create_order: ensure auth check
CREATE OR REPLACE FUNCTION public.deduct_wallet_and_create_order(
  p_order_id text,
  p_service text,
  p_tier text,
  p_amount bigint,
  p_payment_method text DEFAULT 'wallet'
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet record;
  v_to_deduct bigint := p_amount;
  v_use_bonus bigint := 0;
  v_use_balance bigint := 0;
  v_order public.orders;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  IF (v_wallet.balance + v_wallet.bonus) < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Deduct bonus first
  IF v_wallet.bonus >= v_to_deduct THEN
    v_use_bonus := v_to_deduct;
    v_to_deduct := 0;
  ELSE
    v_use_bonus := v_wallet.bonus;
    v_to_deduct := v_to_deduct - v_wallet.bonus;
  END IF;

  v_use_balance := v_to_deduct;

  UPDATE public.wallets
    SET balance = balance - v_use_balance,
        bonus = bonus - v_use_bonus,
        updated_at = now()
    WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions(user_id, type, amount, bonus, note, reference_id)
  VALUES (v_user_id, 'payment', -v_use_balance, -v_use_bonus, 'Bayar order ' || p_order_id, p_order_id);

  INSERT INTO public.orders(id, user_id, service, tier, amount, status, payment_method, paid_at)
  VALUES (p_order_id, v_user_id, p_service, p_tier, p_amount, 'processing', p_payment_method, now())
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_wallet_and_create_order(text, text, text, bigint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION deduct_wallet_and_create_order(text, text, text, bigint, text) FROM anon, public;

-- 4. Fix profiles: prevent role escalation
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
);

-- 5. Admin full access policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Admins have full access to wallets" ON wallets;
DROP POLICY IF EXISTS "Admins have full access to wallet_transactions" ON wallet_transactions;

CREATE POLICY "Admins have full access to profiles" ON profiles
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to wallets" ON wallets
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to wallet_transactions" ON wallet_transactions
FOR ALL USING (is_admin(auth.uid()));

-- 6. Create pending_topups table
CREATE TABLE IF NOT EXISTS public.pending_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  bonus bigint DEFAULT 0,
  method text DEFAULT 'transfer',
  note text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  reject_reason text
);

ALTER TABLE pending_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own pending topups" ON pending_topups
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own pending topups" ON pending_topups
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only service_role can update pending topups" ON pending_topups
FOR UPDATE USING (auth.role() = 'service_role');
