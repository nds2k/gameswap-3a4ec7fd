-- Remove global chat RLS policies and conversation
DROP POLICY IF EXISTS "Anyone can view global chat messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send to global chat" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view global conversation" ON public.conversations;

-- Delete the global chat conversation
DELETE FROM public.messages WHERE conversation_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.conversations WHERE id = '00000000-0000-0000-0000-000000000001';