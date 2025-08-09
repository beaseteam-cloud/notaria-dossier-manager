-- Mettre à jour les politiques RLS pour permettre aux utilisateurs de modifier les dossiers qui leur sont assignés

-- Supprimer les anciennes politiques de mise à jour
DROP POLICY IF EXISTS "Admins and collaborateurs can update dossiers" ON public.dossiers;
DROP POLICY IF EXISTS "Users can update etapes they are assigned to" ON public.etapes_dossiers;

-- Nouvelle policy pour modifier les dossiers
CREATE POLICY "Users can update assigned dossiers" 
ON public.dossiers 
FOR UPDATE 
USING (
  -- Admins et collaborateurs peuvent tout modifier
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]))
  OR 
  -- Créateur du dossier peut le modifier
  (created_by = auth.uid())
  OR
  -- Participants au dossier peuvent le modifier
  (EXISTS (
    SELECT 1 
    FROM public.dossier_participants dp 
    WHERE dp.dossier_id = dossiers.id 
    AND dp.user_id = get_current_profile_id()
  ))
);

-- Nouvelle policy pour modifier les étapes
CREATE POLICY "Users can update assigned etapes" 
ON public.etapes_dossiers 
FOR UPDATE 
USING (
  -- Admins et collaborateurs peuvent tout modifier
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]))
  OR
  -- Étapes assignées à l'utilisateur (si assignee_id est un user_id)
  (assignee_id = auth.uid())
  OR
  -- Participants au dossier peuvent modifier les étapes
  (EXISTS (
    SELECT 1 
    FROM public.dossiers d
    JOIN public.dossier_participants dp ON dp.dossier_id = d.id
    WHERE d.id = etapes_dossiers.dossier_id 
    AND dp.user_id = get_current_profile_id()
  ))
);