-- Fix profiles table RLS: Restrict SELECT to own profile OR admin/collaborateur roles
-- Drop the current overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive SELECT policy
CREATE POLICY "Users can view profiles with role restrictions" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
);