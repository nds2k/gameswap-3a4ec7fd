-- Create transactions table if missing
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "transactions_select_own" ON public.transactions 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY IF NOT EXISTS "transactions_insert_own" ON public.transactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "transactions_update_own" ON public.transactions 
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = buyer_id OR auth.uid() = seller_id);
