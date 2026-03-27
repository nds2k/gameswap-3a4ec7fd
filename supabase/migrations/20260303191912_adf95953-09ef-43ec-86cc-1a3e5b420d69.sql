
-- Add last_username_change to profiles for 14-day cooldown
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_username_change timestamptz DEFAULT NULL;

-- Add selected_badge_id for profile badge display
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_badge_id uuid REFERENCES public.badges(id) DEFAULT NULL;
