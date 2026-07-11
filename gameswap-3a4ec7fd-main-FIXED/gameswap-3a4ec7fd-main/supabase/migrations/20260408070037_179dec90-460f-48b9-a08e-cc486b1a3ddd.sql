ALTER TABLE public.profiles
ALTER COLUMN xp SET DEFAULT 40;

CREATE OR REPLACE FUNCTION public.build_profile_username(
  desired_username text,
  fallback_email text,
  auth_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  safe_username text;
BEGIN
  base_username := lower(
    regexp_replace(
      coalesce(nullif(desired_username, ''), split_part(coalesce(fallback_email, ''), '@', 1), 'joueur'),
      '[^a-z0-9_]+',
      '',
      'g'
    )
  );

  base_username := trim(both '_' from base_username);

  IF base_username = '' THEN
    base_username := 'joueur';
  END IF;

  safe_username := left(base_username, 18);

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(safe_username)
      AND user_id <> auth_user_id
  ) THEN
    safe_username := left(base_username, 11) || '_' || left(replace(auth_user_id::text, '-', ''), 6);
  END IF;

  RETURN safe_username;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_username text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.email_confirmed_at, OLD.confirmed_at) IS NOT NULL
     AND COALESCE(NEW.email_confirmed_at, NEW.confirmed_at) IS NOT NULL
     AND NEW.raw_user_meta_data IS NOT DISTINCT FROM OLD.raw_user_meta_data
     AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.email_confirmed_at, NEW.confirmed_at) IS NULL THEN
    RETURN NEW;
  END IF;

  profile_username := public.build_profile_username(
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'user_name'),
    NEW.email,
    NEW.id
  );

  INSERT INTO public.profiles (id, user_id, full_name, avatar_url, username, xp)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    profile_username,
    40
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    xp = COALESCE(public.profiles.xp, EXCLUDED.xp)
  WHERE public.profiles.full_name IS NULL
     OR public.profiles.avatar_url IS NULL
     OR public.profiles.username IS NULL
     OR public.profiles.xp IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;

CREATE TRIGGER on_auth_user_profile_sync
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, user_id, full_name, avatar_url, username, xp)
SELECT
  au.id,
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  au.raw_user_meta_data->>'avatar_url',
  public.build_profile_username(
    COALESCE(au.raw_user_meta_data->>'username', au.raw_user_meta_data->>'user_name'),
    au.email,
    au.id
  ),
  40
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
  AND COALESCE(au.email_confirmed_at, au.confirmed_at) IS NOT NULL;

UPDATE public.profiles p
SET username = public.build_profile_username(NULL, au.email, au.id)
FROM auth.users au
WHERE p.user_id = au.id
  AND (p.username IS NULL OR btrim(p.username) = '');