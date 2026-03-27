
-- Table: trades
CREATE TABLE public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  user1_confirmed boolean NOT NULL DEFAULT false,
  user2_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their trades" ON public.trades
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Authenticated users can create trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Trade participants can update" ON public.trades
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Table: ratings
CREATE TABLE public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT no_self_rating CHECK (rater_id <> rated_user_id),
  CONSTRAINT unique_rating_per_trade UNIQUE (trade_id, rater_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings viewable by everyone" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Table: game_images (multiple photos per listing)
CREATE TABLE public.game_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game images viewable by everyone" ON public.game_images
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert game images" ON public.game_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete game images" ON public.game_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND owner_id = auth.uid())
  );

-- Table: favorites
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_favorite UNIQUE (user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Table: favorite_notifications
CREATE TABLE public.favorite_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.favorite_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.favorite_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.favorite_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for favorite_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorite_notifications;

-- Function: notify favorites when listing is updated
CREATE OR REPLACE FUNCTION public.notify_favorites_on_listing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if meaningful fields changed
  IF OLD.title IS DISTINCT FROM NEW.title
    OR OLD.description IS DISTINCT FROM NEW.description
    OR OLD.price IS DISTINCT FROM NEW.price
    OR OLD.image_url IS DISTINCT FROM NEW.image_url
  THEN
    INSERT INTO public.favorite_notifications (user_id, listing_id, message)
    SELECT f.user_id, NEW.id, 'Cette annonce que vous avez sauvegardée a été mise à jour.'
    FROM public.favorites f
    WHERE f.listing_id = NEW.id
      AND f.user_id <> NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_favorites_on_update
  AFTER UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_favorites_on_listing_update();
