-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update content_reports RLS to allow admin/moderator access
DROP POLICY IF EXISTS "Users can view their own reports" ON public.content_reports;

CREATE POLICY "Users can view their own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = reporter_id OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update reports"
ON public.content_reports
FOR UPDATE
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Allow admins to update forum posts moderation status
DROP POLICY IF EXISTS "Users can update their own posts" ON public.forum_posts;

CREATE POLICY "Users can update their own posts"
ON public.forum_posts
FOR UPDATE
USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

-- Allow admins to update forum replies moderation status
DROP POLICY IF EXISTS "Users can update their own replies" ON public.forum_replies;

CREATE POLICY "Users can update their own replies"
ON public.forum_replies
FOR UPDATE
USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

-- Allow admins to view all posts (including pending moderation)
DROP POLICY IF EXISTS "Approved posts are viewable by everyone" ON public.forum_posts;

CREATE POLICY "Posts viewable by everyone or admins"
ON public.forum_posts
FOR SELECT
USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_admin_or_moderator(auth.uid()));

-- Allow admins to view all replies
DROP POLICY IF EXISTS "Approved replies are viewable by everyone" ON public.forum_replies;

CREATE POLICY "Replies viewable by everyone or admins"
ON public.forum_replies
FOR SELECT
USING (moderation_status = 'approved' OR author_id = auth.uid() OR public.is_admin_or_moderator(auth.uid()));