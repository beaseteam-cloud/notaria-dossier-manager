-- Fix: Remove creator access for clercs to prevent data exposure
-- Clercs who create dossiers should only access via participant assignment

-- Update SELECT policy on dossiers
DROP POLICY IF EXISTS "Full access for admins collaborateurs and creators" ON public.dossiers;

-- Only admins and collaborateurs can access dossiers directly
-- All other access (including clercs) must go through dossiers_secure view
CREATE POLICY "Admins and collaborateurs can view all dossiers" 
ON public.dossiers 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
);

-- Drop and recreate the secure view without SECURITY DEFINER
DROP VIEW IF EXISTS public.dossiers_secure;

-- Recreate view explicitly with security_invoker = true
CREATE VIEW public.dossiers_secure 
WITH (security_invoker = on)
AS
SELECT 
  d.id,
  d.nom,
  d.description,
  d.procedure_modele_id,
  d.status,
  d.etape_courante_id,
  d.pourcentage_completion,
  d.date_creation,
  d.date_fin,
  d.created_by,
  d.created_at,
  d.updated_at,
  d.notes_retard,
  d.situation_fiscale,
  d.client_nom,
  d.client_prenom,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.client_email
    ELSE NULL
  END AS client_email,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.client_telephone
    ELSE NULL
  END AS client_telephone,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.client_adresse
    ELSE NULL
  END AS client_adresse,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.montant_frais
    ELSE NULL
  END AS montant_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.date_note_frais
    ELSE NULL
  END AS date_note_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.montant_provisions
    ELSE NULL
  END AS montant_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.date_provisions
    ELSE NULL
  END AS date_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.montant_reglement_partiel
    ELSE NULL
  END AS montant_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.date_reglement_partiel
    ELSE NULL
  END AS date_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.montant_solde
    ELSE NULL
  END AS montant_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.date_reglement_solde
    ELSE NULL
  END AS date_reglement_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.montant_depot_capital
    ELSE NULL
  END AS montant_depot_capital,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN d.date_depot_capital
    ELSE NULL
  END AS date_depot_capital
FROM public.dossiers d
WHERE 
  -- Admins and collaborateurs see all
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
  -- Participants (including clercs) see assigned dossiers only
  OR EXISTS (
    SELECT 1 FROM public.dossier_participants dp 
    WHERE dp.dossier_id = d.id 
    AND dp.user_id = get_current_profile_id()
  );

GRANT SELECT ON public.dossiers_secure TO authenticated;

COMMENT ON VIEW public.dossiers_secure IS 'Secure view of dossiers - masks sensitive client/financial data for clercs, participant-based access only';