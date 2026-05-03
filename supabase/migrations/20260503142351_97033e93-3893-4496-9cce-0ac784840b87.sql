-- 1. forum_likes: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.forum_likes;
CREATE POLICY "Authenticated users can view likes"
ON public.forum_likes
FOR SELECT
TO authenticated
USING (true);

-- 2. transactions: revoke sensitive columns from client roles
REVOKE SELECT (buyer_email, stripe_checkout_session_id, stripe_payment_intent_id)
  ON public.transactions FROM anon, authenticated;

-- 3. user_bans: allow admins/moderators to update and delete
CREATE POLICY "Admins can update bans"
ON public.user_bans
FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete bans"
ON public.user_bans
FOR DELETE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));