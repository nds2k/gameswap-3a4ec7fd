
-- 1. Master Games Catalog
CREATE TABLE public.master_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    normalized_title VARCHAR(255) NOT NULL,
    publisher VARCHAR(255),
    category VARCHAR(100),
    min_players INT,
    max_players INT,
    min_age INT,
    release_year INT,
    cover_image_url TEXT,
    description TEXT,
    play_time VARCHAR(50),
    popularity_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.master_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master games viewable by everyone" ON public.master_games FOR SELECT USING (true);

CREATE INDEX idx_master_games_normalized_title ON public.master_games(normalized_title);

-- 2. Barcode Index (multi-barcode per game)
CREATE TABLE public.game_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.master_games(id) ON DELETE CASCADE NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    confidence_score FLOAT DEFAULT 1.0,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.game_barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Barcodes viewable by everyone" ON public.game_barcodes FOR SELECT USING (true);

CREATE INDEX idx_barcode_lookup ON public.game_barcodes(barcode);

-- 3. Price History
CREATE TABLE public.game_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.master_games(id) ON DELETE CASCADE NOT NULL,
    average_price FLOAT,
    min_price FLOAT,
    max_price FLOAT,
    sample_count INT DEFAULT 1,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.game_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history viewable by everyone" ON public.game_price_history FOR SELECT USING (true);

CREATE INDEX idx_price_history_game ON public.game_price_history(game_id, recorded_at DESC);

-- 4. User Collections
CREATE TABLE public.user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id UUID REFERENCES public.master_games(id) ON DELETE CASCADE NOT NULL,
    condition VARCHAR(50),
    notes TEXT,
    acquired_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their collection" ON public.user_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to collection" ON public.user_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update collection" ON public.user_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove from collection" ON public.user_collections FOR DELETE USING (auth.uid() = user_id);

-- 5. Migrate existing barcode_catalog data into new tables
INSERT INTO public.master_games (title, normalized_title, publisher, category, min_players, max_players, min_age, release_year, cover_image_url, description, play_time, created_at)
SELECT 
    name,
    LOWER(REGEXP_REPLACE(TRANSLATE(name, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucAAAEEEEIIOOUUC'), '[^a-zA-Z0-9 ]', '', 'g')),
    publisher,
    category,
    min_players,
    max_players,
    min_age,
    year,
    image_url,
    description,
    play_time,
    created_at
FROM public.barcode_catalog;

INSERT INTO public.game_barcodes (game_id, barcode, source)
SELECT mg.id, bc.barcode, 'bgg'
FROM public.barcode_catalog bc
JOIN public.master_games mg ON mg.title = bc.name
ON CONFLICT (barcode) DO NOTHING;

-- 6. Update trigger for master_games
CREATE TRIGGER update_master_games_updated_at
BEFORE UPDATE ON public.master_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Function to normalize titles (reusable)
CREATE OR REPLACE FUNCTION public.normalize_game_title(raw_title TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(TRIM(REGEXP_REPLACE(
    TRANSLATE(raw_title, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucAAAEEEEIIOOUUC'),
    '[^a-z0-9 ]', '', 'g'
  )))
$$;
