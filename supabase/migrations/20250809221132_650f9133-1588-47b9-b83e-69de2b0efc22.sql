-- Supprimer l'ancienne policy de visualisation des dossiers
DROP POLICY IF EXISTS "Users can view all dossiers" ON public.dossiers;

-- Créer une nouvelle policy plus restrictive pour la visualisation des dossiers
-- Les utilisateurs peuvent voir :
-- 1. Les dossiers qu'ils ont créés
-- 2. Les dossiers où ils sont participants  
-- 3. Tous les dossiers s'ils sont admin ou collaborateur
CREATE POLICY "Users can view assigned dossiers" 
ON public.dossiers 
FOR SELECT 
USING (
  -- Admins et collaborateurs voient tout
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role]))
  OR 
  -- Créateur du dossier
  (created_by = auth.uid())
  OR
  -- Participant au dossier
  (EXISTS (
    SELECT 1 
    FROM public.dossier_participants dp 
    WHERE dp.dossier_id = dossiers.id 
    AND dp.user_id = auth.uid()
  ))
);

-- Supprimer l'ancienne policy de visualisation des étapes
DROP POLICY IF EXISTS "Users can view all etapes" ON public.etapes_dossiers;

-- Créer une nouvelle policy pour les étapes basée sur l'accès aux dossiers
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
      -- Participant au dossier
      (EXISTS (
        SELECT 1 
        FROM public.dossier_participants dp 
        WHERE dp.dossier_id = d.id 
        AND dp.user_id = auth.uid()
      ))
    )
  )
);