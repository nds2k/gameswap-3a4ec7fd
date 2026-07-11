
-- Add escrow tracking to transactions
ALTER TABLE public.transactions
ADD COLUMN escrow_status text NOT NULL DEFAULT 'none',
ADD COLUMN escrow_release_at timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.transactions.escrow_status IS 'none, pending_escrow, released, disputed';
COMMENT ON COLUMN public.transactions.escrow_release_at IS 'When funds should be auto-released to seller';
