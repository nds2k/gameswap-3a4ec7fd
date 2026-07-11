-- Fix overly permissive INSERT policy on conversations table
-- Currently uses WITH CHECK (true), should require authentication

DROP POLICY IF EXISTS "Users can create new conversations" ON public.conversations;

-- Recreate with proper authentication check - only authenticated users can create
CREATE POLICY "Users can create new conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);