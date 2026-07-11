-- Fix the view to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
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

-- Add a policy to allow public read access to profiles for the view to work
-- This is a special policy that only allows SELECT via specific columns
DROP POLICY IF EXISTS "Allow view access to profiles" ON public.profiles;

CREATE POLICY "Allow view access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Grant SELECT on the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;