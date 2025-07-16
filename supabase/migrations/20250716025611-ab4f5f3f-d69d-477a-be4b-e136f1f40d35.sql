-- Configure RLS for realtime notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;