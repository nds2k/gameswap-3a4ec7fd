-- Fix 1: Allow authenticated users to view other profiles (public fields)
-- Note: location data is already sanitized via get_public_profiles RPC for map display
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 2: Restrict user_bans visibility to admins/moderators and the banned user only
DROP POLICY IF EXISTS "Anyone can view bans" ON public.user_bans;

CREATE POLICY "Users can view their own bans"
ON public.user_bans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bans"
ON public.user_bans
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));