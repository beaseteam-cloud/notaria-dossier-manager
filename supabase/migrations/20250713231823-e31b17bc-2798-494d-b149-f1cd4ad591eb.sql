-- Add update policy for dossiers table to allow collaborateurs and admins to update
CREATE POLICY "Admins and collaborateurs can update dossiers"
ON public.dossiers
FOR UPDATE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]));