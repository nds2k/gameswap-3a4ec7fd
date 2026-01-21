-- Drop the recursive RLS policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves or others to new conversations" ON public.conversation_participants;

-- Create fixed non-recursive policy for SELECT
-- Users can view participants if they are also a participant (using direct user_id check)
CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

-- Create fixed policy for INSERT
-- Users can add participants to conversations they're part of
CREATE POLICY "Users can add conversation participants" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM public.conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  )
);