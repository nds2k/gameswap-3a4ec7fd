-- Create user_bans table to track temporary bans
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a user is banned (for display purposes)
CREATE POLICY "Anyone can view bans"
ON public.user_bans FOR SELECT
TO authenticated
USING (true);

-- Only system/admins can insert bans (via function)
CREATE POLICY "System can insert bans"
ON public.user_bans FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Create message_reports table
CREATE TABLE public.message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, reporter_id) -- One report per message per user
);

-- Enable RLS
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (not for own messages)
CREATE POLICY "Users can report messages"
ON public.message_reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id 
  AND auth.uid() != reported_user_id
);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.message_reports FOR SELECT
TO authenticated
USING (reporter_id = auth.uid() OR public.is_admin_or_moderator(auth.uid()));

-- Admins can manage reports
CREATE POLICY "Admins can manage reports"
ON public.message_reports FOR ALL
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- Function to check and apply ban if threshold reached
CREATE OR REPLACE FUNCTION public.check_and_apply_message_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_count INTEGER;
  unique_reporters INTEGER;
BEGIN
  -- Count total reports for this user
  SELECT COUNT(*), COUNT(DISTINCT reporter_id)
  INTO report_count, unique_reporters
  FROM public.message_reports
  WHERE reported_user_id = NEW.reported_user_id
    AND created_at > NOW() - INTERVAL '30 days'; -- Only recent reports count

  -- If 10+ reports from 15+ different people, apply 2 hour ban
  IF report_count >= 10 AND unique_reporters >= 15 THEN
    -- Check if already banned
    IF NOT EXISTS (
      SELECT 1 FROM public.user_bans 
      WHERE user_id = NEW.reported_user_id 
        AND banned_until > NOW()
    ) THEN
      -- Insert ban
      INSERT INTO public.user_bans (user_id, banned_until, reason)
      VALUES (
        NEW.reported_user_id, 
        NOW() + INTERVAL '2 hours',
        'Automatic ban: Too many reports from multiple users'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check ban after each report
CREATE TRIGGER check_message_ban_trigger
AFTER INSERT ON public.message_reports
FOR EACH ROW
EXECUTE FUNCTION public.check_and_apply_message_ban();

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_bans
    WHERE user_id = check_user_id
      AND banned_until > NOW()
  )
$$;