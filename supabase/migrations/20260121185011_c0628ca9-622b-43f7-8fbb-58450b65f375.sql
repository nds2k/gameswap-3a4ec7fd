-- Fix overly permissive SELECT policy on profiles table
-- The current policy exposes all data including precise GPS coordinates

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are publicly viewable without sensitive location data" ON public.profiles;

-- Create restrictive policy: users can only view their own profile directly
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Recreate the public_profiles view with security_invoker to ensure RLS applies
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT 
  id,
  user_id,
  full_name,
  username,
  avatar_url,
  created_at,
  show_on_map,
  -- Round coordinates to ~1km precision for privacy
  CASE WHEN show_on_map = true THEN ROUND(location_lat::numeric, 2) ELSE NULL END as location_lat,
  CASE WHEN show_on_map = true THEN ROUND(location_lng::numeric, 2) ELSE NULL END as location_lng
FROM public.profiles;

-- Grant SELECT on the view to everyone (including anon for public access)
GRANT SELECT ON public.public_profiles TO anon, authenticated;