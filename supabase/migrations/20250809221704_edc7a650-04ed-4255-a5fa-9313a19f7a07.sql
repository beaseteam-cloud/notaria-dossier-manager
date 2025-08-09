-- Corriger les politiques RLS pour utiliser les profile_id au lieu des user_id
-- D'abord, supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view assigned dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Users can view etapes of assigned dossiers" ON public.etapes_dossiers;

-- Créer une fonction pour obtenir le profile_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Nouvelle policy pour les dossiers basée sur profile_id
CREATE POLICY "Users can view assigned dossiers" 
ON public.dossiers 
FOR SELECT 
USING (
  -- Admins et collaborateurs voient tout
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]))
  OR 
  -- Créateur du dossier (using profile_id)
  (created_by = auth.uid())
  OR
  -- Participant au dossier (using profile_id)
  (EXISTS (
    SELECT 1 
    FROM public.dossier_participants dp 
    WHERE dp.dossier_id = dossiers.id 
    AND dp.user_id = get_current_profile_id()
  ))
);

-- Nouvelle policy pour les étapes basée sur profile_id
CREATE POLICY "Users can view etapes of assigned dossiers" 
ON public.etapes_dossiers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.dossiers d 
    WHERE d.id = etapes_dossiers.dossier_id 
    AND (
      -- Admins et collaborateurs voient tout
      (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]))
      OR 
      -- Créateur du dossier
      (d.created_by = auth.uid())
      OR
      -- Participant au dossier (using profile_id)
      (EXISTS (
        SELECT 1 
        FROM public.dossier_participants dp 
        WHERE dp.dossier_id = d.id 
        AND dp.user_id = get_current_profile_id()
      ))
    )
  )
);