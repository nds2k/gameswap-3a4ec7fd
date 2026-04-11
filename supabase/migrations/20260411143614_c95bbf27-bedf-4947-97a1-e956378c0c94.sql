
-- Re-attach the trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_profile_sync ON auth.users;
CREATE TRIGGER on_auth_user_profile_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any confirmed users missing profiles
INSERT INTO public.profiles (id, user_id, username, xp)
SELECT
  u.id,
  u.id,
  public.build_profile_username(
    COALESCE(u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'user_name'),
    u.email,
    u.id
  ),
  40
FROM auth.users u
WHERE COALESCE(u.email_confirmed_at, u.confirmed_at) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
