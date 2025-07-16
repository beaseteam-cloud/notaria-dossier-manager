-- Ajouter la politique DELETE pour les dossiers
CREATE POLICY "Admins and collaborateurs can delete dossiers" 
ON public.dossiers 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]));