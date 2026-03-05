
-- User rewards table for claimed rewards (wheel spins, etc.)
CREATE TABLE public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_data jsonb DEFAULT '{}'::jsonb,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  used boolean NOT NULL DEFAULT false
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rewards" ON public.user_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their rewards" ON public.user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their rewards" ON public.user_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- User interests for recommendation engine
CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  score double precision NOT NULL DEFAULT 1.0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their interests" ON public.user_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their interests" ON public.user_interests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their interests" ON public.user_interests
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_rewards_user ON public.user_rewards(user_id);
CREATE INDEX idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX idx_user_interests_category ON public.user_interests(user_id, category);

-- Add last_wheel_spin to profiles for cooldown
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_wheel_spin timestamp with time zone;
