-- Fix 1: Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Fix 2: Add search_path protection to SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;