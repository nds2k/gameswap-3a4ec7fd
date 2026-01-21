-- Add message reactions support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}';

-- Add reply_to support for threaded messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id);

-- Add image_url for media messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Create index for faster reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- Update the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;