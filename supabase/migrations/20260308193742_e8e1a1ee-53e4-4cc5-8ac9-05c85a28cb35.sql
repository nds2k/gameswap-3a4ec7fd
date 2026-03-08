
-- Activity history table for tracking scans and searches
CREATE TABLE public.activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_id UUID REFERENCES public.master_games(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('scan', 'search')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_activity_history_user_id ON public.activity_history(user_id);
CREATE INDEX idx_activity_history_created_at ON public.activity_history(created_at DESC);

-- RLS
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON public.activity_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON public.activity_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity"
  ON public.activity_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
