
-- Add BGG-specific columns to master_games
ALTER TABLE public.master_games 
  ADD COLUMN IF NOT EXISTS bgg_id integer,
  ADD COLUMN IF NOT EXISTS rating double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_reviews integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create unique index on bgg_id for dedup
CREATE UNIQUE INDEX IF NOT EXISTS master_games_bgg_id_unique ON public.master_games(bgg_id) WHERE bgg_id IS NOT NULL;
