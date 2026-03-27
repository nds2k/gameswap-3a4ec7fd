
-- Add XP and rank fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_streak DATE;

-- Add boost fields to games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS boost_type TEXT; -- 'XP_48H' | 'XP_7D' | 'PAID_24H' | 'PAID_72H' | 'PAID_7D'

-- XP transaction history table
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role / edge functions insert XP (no direct client insert)
CREATE POLICY "Admin can insert XP transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-expire boosts: function to clear expired boosts
CREATE OR REPLACE FUNCTION public.clear_expired_boosts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.games
  SET is_boosted = false, boost_expires_at = NULL, boost_type = NULL
  WHERE is_boosted = true AND boost_expires_at IS NOT NULL AND boost_expires_at < NOW();
END;
$$;
