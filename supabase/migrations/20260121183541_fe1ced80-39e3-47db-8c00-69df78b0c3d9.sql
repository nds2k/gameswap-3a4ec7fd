-- Drop the existing view
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate with security_invoker=on (the secure pattern)
CREATE VIEW public.public_profiles
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    full_name,
    username,
    avatar_url,
    show_on_map,
    created_at,
    -- Approximate location (2 decimal places ~1km precision)
    ROUND(location_lat::numeric, 2)::double precision as location_lat,
    ROUND(location_lng::numeric, 2)::double precision as location_lng
  FROM public.profiles
  WHERE show_on_map = true OR show_on_map IS NULL;