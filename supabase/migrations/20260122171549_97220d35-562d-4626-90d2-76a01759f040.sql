-- Create a global chat conversation that all users can access
INSERT INTO public.conversations (id, name, is_group, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Global Chat',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy to allow any authenticated user to view and send messages in global chat
CREATE POLICY "Anyone can view global chat messages"
ON public.messages FOR SELECT
USING (conversation_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "Authenticated users can send to global chat"
ON public.messages FOR INSERT
WITH CHECK (
  conversation_id = '00000000-0000-0000-0000-000000000001' 
  AND auth.uid() = sender_id
);

-- Allow anyone authenticated to be a "virtual" participant in global chat
CREATE POLICY "Anyone can view global conversation"
ON public.conversations FOR SELECT
USING (id = '00000000-0000-0000-0000-000000000001');