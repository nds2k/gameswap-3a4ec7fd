-- Drop the existing restrictive policy for inserting participants
DROP POLICY IF EXISTS "Users can add participants with restrictions" ON conversation_participants;

-- Create a new policy that allows:
-- 1. Users to add themselves to any conversation
-- 2. Users to add anyone when creating a new 1-on-1 conversation (where they just added themselves)
-- 3. Original restrictions for group chats and friend requirements
CREATE POLICY "Users can add participants"
ON conversation_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- Can always add yourself
    user_id = auth.uid()
    -- Or can add someone else if:
    OR (
      -- You are friends with them
      are_friends(auth.uid(), user_id)
      -- Or you are already a participant in this conversation (just added yourself)
      OR EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
      )
      -- Or for groups, you're already in the group
      OR EXISTS (
        SELECT 1 
        FROM conversation_participants cp
        JOIN conversations c ON c.id = cp.conversation_id
        WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND c.is_group = true
      )
    )
  )
);