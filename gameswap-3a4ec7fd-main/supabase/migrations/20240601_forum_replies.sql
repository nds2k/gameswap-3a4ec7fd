-- Create forum_replies table
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "forum_replies_select_all" ON public.forum_replies 
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "forum_replies_insert_own" ON public.forum_replies 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "forum_replies_update_own" ON public.forum_replies 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "forum_replies_delete_own" ON public.forum_replies 
  FOR DELETE USING (auth.uid() = user_id);

-- Fix conversation_participants RLS infinite recursion
DROP POLICY IF EXISTS "conversation_participants_select" ON public.conversation_participants;
CREATE POLICY "conversation_participants_select" ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "conversation_participants_insert" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversation_participants_delete" ON public.conversation_participants;
CREATE POLICY "conversation_participants_delete" ON public.conversation_participants
  FOR DELETE USING (auth.uid() = user_id);
