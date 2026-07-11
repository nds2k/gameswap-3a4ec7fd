
-- Create transactions table for payment tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  buyer_email TEXT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_link_url TEXT,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Sellers can see their own transactions
CREATE POLICY "Sellers can view their transactions"
  ON public.transactions FOR SELECT
  USING (seller_id = auth.uid());

-- Buyers can see their own transactions
CREATE POLICY "Buyers can view their transactions"
  ON public.transactions FOR SELECT
  USING (buyer_id = auth.uid());

-- Only edge functions (service role) insert/update transactions
-- No direct insert/update policies for regular users

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for transaction status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
