-- Fix dossiers table RLS: Restrict INSERT to admin and collaborateur roles only
-- Drop the current overly permissive INSERT policy
DROP POLICY IF EXISTS "All authenticated users can create dossiers" ON public.dossiers;

-- Create a more restrictive INSERT policy for admin and collaborateur only
CREATE POLICY "Admins and collaborateurs can create dossiers" 
ON public.dossiers 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]));