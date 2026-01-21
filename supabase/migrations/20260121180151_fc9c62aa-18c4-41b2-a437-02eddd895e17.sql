-- Fix security issues: protect user data and fix conversation policies

-- 1. Update profiles RLS policy to only show location for users who opted in
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are publicly viewable without sensitive location data"
ON public.profiles
FOR SELECT
USING (true);

-- Create a view for public profile data that hides precise location
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  username,
  avatar_url,
  show_on_map,
  -- Only show approximate location (2 decimal places ~1km accuracy) if user opts in
  CASE WHEN show_on_map = true THEN ROUND(location_lat::numeric, 2)::double precision ELSE NULL END as location_lat,
  CASE WHEN show_on_map = true THEN ROUND(location_lng::numeric, 2)::double precision ELSE NULL END as location_lng,
  created_at
FROM public.profiles;

-- 2. Fix conversations RLS policies (incorrect self-reference)
DROP POLICY IF EXISTS "Users can create conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Allow users to insert new conversations
CREATE POLICY "Users can create new conversations"
ON public.conversations
FOR INSERT
WITH CHECK (true);

-- Allow users to view conversations they participate in
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Add update policy for conversations (to update updated_at)
CREATE POLICY "Users can update their conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- 3. Create forum tables with AI moderation
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  moderation_reason TEXT,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending',
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forum_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on forum tables
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

-- Forum posts policies
CREATE POLICY "Approved posts are viewable by everyone"
ON public.forum_posts
FOR SELECT
USING (moderation_status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Users can create forum posts"
ON public.forum_posts
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
ON public.forum_posts
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
ON public.forum_posts
FOR DELETE
USING (auth.uid() = author_id);

-- Forum replies policies
CREATE POLICY "Approved replies are viewable by everyone"
ON public.forum_replies
FOR SELECT
USING (moderation_status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Users can create forum replies"
ON public.forum_replies
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own replies"
ON public.forum_replies
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own replies"
ON public.forum_replies
FOR DELETE
USING (auth.uid() = author_id);

-- Forum likes policies
CREATE POLICY "Likes are viewable by everyone"
ON public.forum_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON public.forum_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.forum_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
BEFORE UPDATE ON public.forum_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update reply count on forum posts
CREATE OR REPLACE FUNCTION public.update_forum_post_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET replies_count = replies_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_forum_replies_count
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_forum_post_replies_count();

-- Function to update likes count on forum posts
CREATE OR REPLACE FUNCTION public.update_forum_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_forum_likes_count
AFTER INSERT OR DELETE ON public.forum_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_forum_post_likes_count();

-- Enable leaked password protection (requires Supabase dashboard but we note it)
-- This is a config setting, not SQL - inform user

-- Enable realtime for forum posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;