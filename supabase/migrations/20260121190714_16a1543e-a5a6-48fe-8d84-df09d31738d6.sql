-- Add unique constraint on username in profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create friendships table for friend requests
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self_friend CHECK (requester_id != addressee_id),
  CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view their friendships"
ON public.friendships
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.friendships
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they received (accept/reject)
CREATE POLICY "Users can respond to friend requests"
ON public.friendships
FOR UPDATE
USING (auth.uid() = addressee_id);

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete their friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;

-- Create function to get friends' games
CREATE OR REPLACE FUNCTION public.get_friends_games(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  price NUMERIC,
  game_type TEXT,
  condition TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  owner_id UUID,
  owner_username TEXT,
  owner_full_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.title,
    g.description,
    g.image_url,
    g.price,
    g.game_type,
    g.condition,
    g.status,
    g.created_at,
    g.owner_id,
    p.username as owner_username,
    p.full_name as owner_full_name,
    p.avatar_url as owner_avatar_url
  FROM public.games g
  JOIN public.profiles p ON g.owner_id = p.user_id
  WHERE g.owner_id IN (
    SELECT f.addressee_id FROM public.friendships f 
    WHERE f.requester_id = user_uuid AND f.status = 'accepted'
    UNION
    SELECT f.requester_id FROM public.friendships f 
    WHERE f.addressee_id = user_uuid AND f.status = 'accepted'
  )
  ORDER BY g.created_at DESC;
END;
$$;

-- Update timestamp trigger for friendships
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();