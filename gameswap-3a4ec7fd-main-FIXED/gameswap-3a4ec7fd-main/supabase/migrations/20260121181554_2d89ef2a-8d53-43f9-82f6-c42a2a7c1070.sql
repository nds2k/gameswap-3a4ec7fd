-- Add list_name column to wishlists for organizing games into lists
ALTER TABLE public.wishlists ADD COLUMN list_name TEXT DEFAULT NULL;