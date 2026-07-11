-- Fix: Allow users to see conversations they just created (before participants are added)
-- Drop the duplicate/conflicting SELECT policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Update the remaining SELECT policy to also allow creator to see their conversation
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
  );

-- Add DELETE policy for messages (to support unsend)
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- Add UPDATE policy for messages (to support editing)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Add DELETE policy for conversation_participants (to support leaving/hiding conversations)
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;
CREATE POLICY "Users can leave conversations" ON public.conversation_participants
  FOR DELETE USING (user_id = auth.uid());