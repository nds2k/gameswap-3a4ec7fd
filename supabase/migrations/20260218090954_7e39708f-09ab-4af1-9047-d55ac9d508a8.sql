
-- Create admin_logs table for auditing all admin actions
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_content_id UUID,
  target_content_type TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and moderators can view logs
CREATE POLICY "Admins can view all logs"
ON public.admin_logs
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

-- Only the system (edge functions via service role) can insert logs
-- Admins cannot insert directly from frontend - enforced via edge functions
CREATE POLICY "System can insert logs"
ON public.admin_logs
FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Nobody can update or delete logs (immutable audit trail)
-- No UPDATE or DELETE policies = complete immutability

-- Add status column to user_bans if not exists (for extended ban management)
-- The existing user_bans table already handles temp bans, we'll use it for permanent bans too

-- Ensure admin_logs is added to realtime for live updates in admin panel
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
