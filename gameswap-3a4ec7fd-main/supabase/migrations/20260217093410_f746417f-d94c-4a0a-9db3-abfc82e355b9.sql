
-- Community polls
CREATE TABLE public.community_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls viewable by everyone" ON public.community_polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON public.community_polls FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their polls" ON public.community_polls FOR DELETE USING (auth.uid() = author_id);

-- Poll votes
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.community_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes viewable by everyone" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Trade stories
CREATE TABLE public.trade_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  trade_id UUID REFERENCES public.trades(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories viewable by everyone" ON public.trade_stories FOR SELECT USING (true);
CREATE POLICY "Users can create stories" ON public.trade_stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their stories" ON public.trade_stories FOR DELETE USING (auth.uid() = author_id);

-- Looking for tags on games
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS looking_for_tags TEXT[] DEFAULT '{}';
