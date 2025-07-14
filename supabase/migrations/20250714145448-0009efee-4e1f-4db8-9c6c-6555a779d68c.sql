-- Add missing RLS policies for etapes_dossiers table to allow INSERT and DELETE operations

-- Allow admins and collaborateurs to insert new etapes for dossiers
CREATE POLICY "Admins and collaborateurs can create etapes for dossiers"
ON public.etapes_dossiers
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]));

-- Allow admins and collaborateurs to delete etapes from dossiers
CREATE POLICY "Admins and collaborateurs can delete etapes from dossiers"
ON public.etapes_dossiers
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]));