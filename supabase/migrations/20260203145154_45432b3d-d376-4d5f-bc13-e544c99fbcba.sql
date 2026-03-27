-- Add public_key column to profiles for E2EE key exchange
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Add encrypted_key column to messages for per-recipient encrypted symmetric keys
-- This stores the AES key encrypted with recipient's public key
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS encrypted_keys JSONB;