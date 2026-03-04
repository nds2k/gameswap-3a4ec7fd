
-- Fix search_path on normalize_game_title
CREATE OR REPLACE FUNCTION public.normalize_game_title(raw_title TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LOWER(TRIM(REGEXP_REPLACE(
    TRANSLATE(raw_title, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucAAAEEEEIIOOUUC'),
    '[^a-z0-9 ]', '', 'g'
  )))
$$;
