-- ReZA E-Wallet Database Schema for Supabase
-- Run this script to set up the database tables

-- Users/Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  currency TEXT DEFAULT 'ZAR' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'cheque',
  branch_code TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_method TEXT,
  bank_account_id UUID REFERENCES bank_accounts(id),
  reference TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment links table (for iKhokha)
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  ikhokha_reference TEXT,
  payment_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_ikhokha_reference ON payment_links(ikhokha_reference);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet" ON wallets
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own wallet" ON wallets
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own wallet" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment_links
CREATE POLICY "Users can view their own payment links" ON payment_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment links" ON payment_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment links" ON payment_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update wallet balance (for secure transactions)
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT
) RETURNS DECIMAL AS $$
DECLARE
  new_balance DECIMAL;
BEGIN
  IF p_type = 'deposit' THEN
    UPDATE wallets 
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO new_balance;
  ELSIF p_type = 'withdrawal' THEN
    -- Check if sufficient balance
    IF (SELECT balance FROM wallets WHERE id = p_user_id) < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    UPDATE wallets 
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING balance INTO new_balance;
  END IF;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process deposit
CREATE OR REPLACE FUNCTION process_deposit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_payment_method TEXT,
  p_reference TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  new_balance DECIMAL;
  transaction_id UUID;
BEGIN
  -- Update balance
  new_balance := update_wallet_balance(p_user_id, p_amount, 'deposit');
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description, payment_method, reference, status)
  VALUES (p_user_id, 'deposit', p_amount, p_description, p_payment_method, p_reference, 'completed')
  RETURNING id INTO transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', transaction_id,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process withdrawal
CREATE OR REPLACE FUNCTION process_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_bank_account_id UUID
) RETURNS JSONB AS $$
DECLARE
  new_balance DECIMAL;
  transaction_id UUID;
BEGIN
  -- Update balance (will raise exception if insufficient)
  new_balance := update_wallet_balance(p_user_id, p_amount, 'withdrawal');
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, amount, description, bank_account_id, status)
  VALUES (p_user_id, 'withdrawal', p_amount, p_description, p_bank_account_id, 'completed')
  RETURNING id INTO transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', transaction_id,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
