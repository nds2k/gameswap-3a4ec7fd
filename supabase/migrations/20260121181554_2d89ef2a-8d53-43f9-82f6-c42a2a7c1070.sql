-- Add list_name column to wishlist for organizing games into lists
ALTER TABLE public.wishlist ADD COLUMN list_name TEXT DEFAULT NULL;