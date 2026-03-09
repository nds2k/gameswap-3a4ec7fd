
-- Add complexity field to master_games
ALTER TABLE public.master_games ADD COLUMN IF NOT EXISTS complexity double precision DEFAULT NULL;

-- Create sales_history table for StockX-style tracking
CREATE TABLE IF NOT EXISTS public.sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.master_games(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  price numeric NOT NULL,
  condition text,
  sold_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view sales history (public market data)
CREATE POLICY "Sales history viewable by everyone"
  ON public.sales_history FOR SELECT
  TO public
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_sales_history_game_id ON public.sales_history(game_id);
CREATE INDEX idx_sales_history_sold_at ON public.sales_history(sold_at);
