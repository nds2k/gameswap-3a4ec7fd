-- User interests for recommendations
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  score float DEFAULT 1.0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "ui_select" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "ui_insert" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "ui_update" ON public.user_interests FOR UPDATE USING (auth.uid() = user_id);

-- Add missing columns to games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS boost_type text;
