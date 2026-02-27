
-- Add Stripe Connect account ID to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;
