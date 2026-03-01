
-- Badges reference table
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  emoji text NOT NULL DEFAULT '🏅',
  badge_type text NOT NULL DEFAULT 'achievement', -- achievement, streak, xp_milestone, monthly_draw
  rarity text NOT NULL DEFAULT 'common', -- common, rare, legendary
  criteria jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT USING (true);

-- User earned badges
CREATE TABLE public.user_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert user badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Monthly draw tracking
CREATE TABLE public.monthly_draws (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  month_year text NOT NULL, -- format: '2026-03'
  drawn_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.monthly_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own draws" ON public.monthly_draws FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own draw" ON public.monthly_draws FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed initial badges
INSERT INTO public.badges (name, description, emoji, badge_type, rarity, criteria) VALUES
  ('Lucky Spinner', 'Obtenu lors du tirage mensuel', '🍀', 'monthly_draw', 'rare', '{}'),
  ('Consistent Trader', 'Connecté 3 mois consécutifs', '🔥', 'streak', 'rare', '{"months": 3}'),
  ('XP Master', 'Atteint 5000 XP', '⚡', 'xp_milestone', 'legendary', '{"xp": 5000}'),
  ('First Sale', 'Première vente réalisée', '💰', 'achievement', 'common', '{"sales": 1}'),
  ('Top Trader', '10 échanges complétés', '🤝', 'achievement', 'rare', '{"trades": 10}'),
  ('Elite Member', 'Atteint le rang Elite', '👑', 'xp_milestone', 'legendary', '{"rank": "Elite"}'),
  ('Social Butterfly', '10 amis ajoutés', '🦋', 'achievement', 'common', '{"friends": 10}'),
  ('Collector', '20 jeux publiés', '📦', 'achievement', 'rare', '{"listings": 20}');
