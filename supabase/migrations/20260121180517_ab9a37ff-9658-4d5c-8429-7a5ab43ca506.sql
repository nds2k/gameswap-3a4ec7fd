-- Add group-related columns to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update RLS policy for conversations to allow group management
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  )
);

-- Allow deleting participants (for leaving groups)
CREATE POLICY "Users can leave conversations" 
ON public.conversation_participants 
FOR DELETE 
USING (user_id = auth.uid());