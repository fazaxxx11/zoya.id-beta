-- Migration for wallet and top-up security hardening

-- 1. Create pending_topups table
CREATE TABLE IF NOT EXISTS pending_topups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    bonus integer DEFAULT 0,
    method text DEFAULT 'transfer',
    note text DEFAULT '',
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    reject_reason text
);

-- 2. Add RLS policies on pending_topups
ALTER TABLE pending_topups ENABLE ROW LEVEL SECURITY;

-- Users can insert their own pending topups
CREATE POLICY "Users can insert own pending topups" ON pending_topups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own pending topups
CREATE POLICY "Users can read own pending topups" ON pending_topups
    FOR SELECT USING (auth.uid() = user_id);

-- Only service_role can update (admin approval)
CREATE POLICY "Only service_role can update pending topups" ON pending_topups
    FOR UPDATE USING (auth.role() = 'service_role');

-- 3. Drop existing top_up_wallet function if exists
DROP FUNCTION IF EXISTS top_up_wallet(uuid, integer, text);

-- Recreate with SECURITY DEFINER and is_admin check
CREATE OR REPLACE FUNCTION top_up_wallet(
    p_user_id uuid,
    p_amount integer,
    p_reference_id text DEFAULT NULL
) RETURNS void AS $$
DECLARE
    caller_is_admin boolean;
BEGIN
    -- Check if caller is admin from profiles table
    SELECT (role = 'admin') INTO caller_is_admin
    FROM profiles WHERE id = auth.uid();
    
    IF NOT caller_is_admin THEN
        RAISE EXCEPTION 'Only admins can top up wallets';
    END IF;
    
    -- Update wallet balance
    INSERT INTO wallets (user_id, balance, bonus)
    VALUES (p_user_id, p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE SET 
        balance = wallets.balance + EXCLUDED.balance;
    
    -- Record transaction
    INSERT INTO wallet_transactions (user_id, type, amount, bonus, reference_id)
    VALUES (p_user_id, 'topup', p_amount, 0, p_reference_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant EXECUTE only to authenticated role (not anon)
GRANT EXECUTE ON FUNCTION top_up_wallet TO authenticated;
REVOKE EXECUTE ON FUNCTION top_up_wallet FROM anon, public;

-- 5. Create deduct_wallet_and_create_order RPC
CREATE OR REPLACE FUNCTION deduct_wallet_and_create_order(
    p_user_id uuid,
    p_amount integer,
    p_service text,
    p_tier text,
    p_order_id text
) RETURNS void AS $$
DECLARE
    current_balance integer;
    current_bonus integer;
    remaining_deduction integer;
BEGIN
    -- Get current balance and bonus
    SELECT COALESCE(balance, 0), COALESCE(bonus, 0) 
    INTO current_balance, current_bonus
    FROM wallets WHERE user_id = p_user_id;
    
    -- Check if sufficient funds
    IF (current_balance + current_bonus) < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Calculate deduction from bonus first
    remaining_deduction := p_amount;
    
    -- Deduct from bonus first
    IF current_bonus > 0 THEN
        IF current_bonus >= remaining_deduction THEN
            current_bonus := current_bonus - remaining_deduction;
            remaining_deduction := 0;
        ELSE
            remaining_deduction := remaining_deduction - current_bonus;
            current_bonus := 0;
        END IF;
    END IF;
    
    -- Deduct remaining from balance
    IF remaining_deduction > 0 THEN
        current_balance := current_balance - remaining_deduction;
    END IF;
    
    -- Update wallet
    UPDATE wallets SET
        balance = current_balance,
        bonus = current_bonus
    WHERE user_id = p_user_id;
    
    -- Create order
    INSERT INTO orders (id, user_id, service, tier, amount, status, created_at)
    VALUES (p_order_id, p_user_id, p_service, p_tier, p_amount, 'completed', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant EXECUTE only to authenticated role
GRANT EXECUTE ON FUNCTION deduct_wallet_and_create_order TO authenticated;
REVOKE EXECUTE ON FUNCTION deduct_wallet_and_create_order FROM anon, public;