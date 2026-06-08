-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = uid AND role = 'admin'
    );
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update own profile except role" ON profiles;
DROP POLICY IF EXISTS "Users read own wallet" ON wallets;
DROP POLICY IF EXISTS "Users read own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users read own orders" ON orders;

-- Users can only update their own profile, but cannot change their role
CREATE POLICY "Users can update own profile except role" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
);

-- Users can only read their own wallet
CREATE POLICY "Users read own wallet" ON wallets 
FOR SELECT USING (auth.uid() = user_id);

-- Users can only read their own wallet transactions
CREATE POLICY "Users read own transactions" ON wallet_transactions 
FOR SELECT USING (auth.uid() = user_id);

-- Users can only read their own orders
CREATE POLICY "Users read own orders" ON orders 
FOR SELECT USING (auth.uid() = user_id);

-- Ensure admins can still access everything
CREATE POLICY "Admins have full access to profiles" ON profiles
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to wallets" ON wallets
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to wallet_transactions" ON wallet_transactions
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins have full access to orders" ON orders
FOR ALL USING (is_admin(auth.uid()));