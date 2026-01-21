-- Remove the overly permissive anon policy we just created
DROP POLICY IF EXISTS "Allow view access to profiles" ON public.profiles;

-- Drop the view - we'll use a security definer function instead
DROP VIEW IF EXISTS public.public_profiles;

-- Create a security definer function that returns safe public profile data
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz,
  show_on_map boolean,
  location_lat numeric,
  location_lng numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.show_on_map,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lat::numeric, 2) ELSE NULL END as location_lat,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lng::numeric, 2) ELSE NULL END as location_lng
  FROM public.profiles p
$$;

-- Create a function to get a single public profile by user_id
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz,
  show_on_map boolean,
  location_lat numeric,
  location_lng numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.show_on_map,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lat::numeric, 2) ELSE NULL END as location_lat,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lng::numeric, 2) ELSE NULL END as location_lng
  FROM public.profiles p
  WHERE p.user_id = target_user_id
$$;