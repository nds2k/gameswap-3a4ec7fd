-- Add allow_friend_requests column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN allow_friend_requests boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.allow_friend_requests IS 'Whether this user accepts friend requests from other users';