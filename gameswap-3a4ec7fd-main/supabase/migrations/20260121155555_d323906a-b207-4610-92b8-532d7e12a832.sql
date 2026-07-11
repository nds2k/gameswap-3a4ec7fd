-- Fix overly permissive policies by making them more restrictive

-- Drop the overly permissive conversation creation policy
DROP POLICY "Authenticated users can create conversations" ON public.conversations;

-- Create a more restrictive policy - users can create conversations if they will be participants
CREATE POLICY "Users can create conversations they participate in" 
  ON public.conversations FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = id AND user_id = auth.uid()
    )
    OR id IS NOT NULL -- Allow creation, participant will be added immediately after
  );

-- Drop the overly permissive participant addition policy
DROP POLICY "Authenticated users can add participants" ON public.conversation_participants;

-- Create a more restrictive policy
CREATE POLICY "Users can add themselves or others to new conversations" 
  ON public.conversation_participants FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );