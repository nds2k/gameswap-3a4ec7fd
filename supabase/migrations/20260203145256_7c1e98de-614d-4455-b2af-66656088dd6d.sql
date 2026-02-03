-- Drop and recreate get_public_profile function with public_key
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(target_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, username text, avatar_url text, created_at timestamp with time zone, show_on_map boolean, location_lat numeric, location_lng numeric, public_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.show_on_map,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lat::numeric, 2) ELSE NULL END as location_lat,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lng::numeric, 2) ELSE NULL END as location_lng,
    p.public_key
  FROM public.profiles p
  WHERE p.user_id = target_user_id
$function$;

-- Drop and recreate get_public_profiles function with public_key
DROP FUNCTION IF EXISTS public.get_public_profiles();

CREATE FUNCTION public.get_public_profiles()
 RETURNS TABLE(id uuid, user_id uuid, full_name text, username text, avatar_url text, created_at timestamp with time zone, show_on_map boolean, location_lat numeric, location_lng numeric, public_key text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.created_at,
    p.show_on_map,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lat::numeric, 2) ELSE NULL END as location_lat,
    CASE WHEN p.show_on_map = true THEN ROUND(p.location_lng::numeric, 2) ELSE NULL END as location_lng,
    p.public_key
  FROM public.profiles p
$function$;