
-- Barcode catalog for storing scanned game metadata
CREATE TABLE public.barcode_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  publisher text,
  year integer,
  image_url text,
  description text,
  category text,
  min_players integer,
  max_players integer,
  min_age integer,
  play_time text,
  bgg_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.barcode_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barcode catalog viewable by everyone"
  ON public.barcode_catalog FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert barcode catalog"
  ON public.barcode_catalog FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- XP awards log to prevent duplicate XP awards
CREATE TABLE public.xp_awards_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  award_type text NOT NULL, -- 'sale', 'wishlist_received'
  reference_id text NOT NULL, -- post_id or composite key
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, award_type, reference_id)
);

ALTER TABLE public.xp_awards_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP awards"
  ON public.xp_awards_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP awards"
  ON public.xp_awards_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_barcode_catalog_barcode ON public.barcode_catalog(barcode);
CREATE INDEX idx_xp_awards_log_user ON public.xp_awards_log(user_id, award_type);
