-- Fix overly permissive RLS policy on conversations table
-- Drop the policy with "true" that allows anyone to create conversations
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;

-- The existing policy "Users can create new conversations" already properly requires auth.uid() IS NOT NULL
-- So we just need to remove the duplicate permissive policy

-- Also update the conversation_participants INSERT policy to require friendship for 1-on-1 chats
-- Drop the permissive policy
DROP POLICY IF EXISTS "Users can add conversation participants" ON public.conversation_participants;

-- Create a helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user1 uuid, _user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = _user1 AND addressee_id = _user2)
        OR (requester_id = _user2 AND addressee_id = _user1)
      )
  )
$$;

-- New policy: Users can add themselves to conversations
-- For adding others, they must either:
-- 1. Be friends with the user (for 1-on-1 chats)
-- 2. Be a member of the group conversation (for existing groups)
CREATE POLICY "Users can add participants with restrictions" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User can always add themselves
    user_id = auth.uid()
    OR
    -- User can add someone they're friends with
    are_friends(auth.uid(), user_id)
    OR
    -- User who is in a group conversation can add others to it
    EXISTS (
      SELECT 1 
      FROM public.conversation_participants cp
      JOIN public.conversations c ON c.id = cp.conversation_id
      WHERE cp.conversation_id = conversation_participants.conversation_id 
        AND cp.user_id = auth.uid()
        AND c.is_group = true
    )
  )
);