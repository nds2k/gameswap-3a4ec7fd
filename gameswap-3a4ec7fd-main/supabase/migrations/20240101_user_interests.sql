-- User interests table for recommendations algorithm
CREATE TABLE IF NOT EXISTS public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  score float DEFAULT 1.0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_interests_select_own" ON public.user_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_interests_insert_own" ON public.user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_interests_update_own" ON public.user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Add view_count to games if not exists
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS boost_type text;
