-- Create a security definer function to check conversation membership
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = conv_id
      AND user_id = check_user_id
  )
$$;

-- Drop existing problematic policies on conversation_participants
DROP POLICY IF EXISTS "Users can view their own conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can delete their own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

-- Create new non-recursive policies
CREATE POLICY "Users can view their participations"
ON public.conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view co-participants"
ON public.conversation_participants FOR SELECT
USING (
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Users can insert themselves as participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own participation"
ON public.conversation_participants FOR DELETE
USING (user_id = auth.uid());

-- Also fix conversations table policies if needed
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  public.is_conversation_member(id, auth.uid())
);

CREATE POLICY "Anyone can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Group admins can update conversations"
ON public.conversations FOR UPDATE
USING (
  public.is_conversation_member(id, auth.uid())
);

-- Fix messages table policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  public.is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());