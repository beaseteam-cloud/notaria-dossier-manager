-- Fix Security Definer View warning by using SECURITY INVOKER (default)
-- The view already uses SECURITY INVOKER by default, but let's be explicit

-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.dossiers_secure;

CREATE VIEW public.dossiers_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  nom,
  description,
  procedure_modele_id,
  status,
  etape_courante_id,
  pourcentage_completion,
  date_creation,
  date_fin,
  created_by,
  created_at,
  updated_at,
  notes_retard,
  situation_fiscale,
  -- Mask client contact info for clercs
  client_nom,
  client_prenom,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN client_email
    ELSE NULL
  END AS client_email,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN client_telephone
    ELSE NULL
  END AS client_telephone,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN client_adresse
    ELSE NULL
  END AS client_adresse,
  -- Mask financial data for clercs
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN montant_frais
    ELSE NULL
  END AS montant_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN date_note_frais
    ELSE NULL
  END AS date_note_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN montant_provisions
    ELSE NULL
  END AS montant_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN date_provisions
    ELSE NULL
  END AS date_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN montant_reglement_partiel
    ELSE NULL
  END AS montant_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN date_reglement_partiel
    ELSE NULL
  END AS date_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN montant_solde
    ELSE NULL
  END AS montant_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN date_reglement_solde
    ELSE NULL
  END AS date_reglement_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN montant_depot_capital
    ELSE NULL
  END AS montant_depot_capital,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
    THEN date_depot_capital
    ELSE NULL
  END AS date_depot_capital
FROM public.dossiers d
WHERE 
  -- Admins and collaborateurs see all
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
  -- Creators see their own
  OR d.created_by = auth.uid()
  -- Participants (including clercs) see assigned dossiers
  OR EXISTS (
    SELECT 1 FROM public.dossier_participants dp 
    WHERE dp.dossier_id = d.id 
    AND dp.user_id = get_current_profile_id()
  );

-- Grant access to the secure view
GRANT SELECT ON public.dossiers_secure TO authenticated;

-- Add comment
COMMENT ON VIEW public.dossiers_secure IS 'Secure view of dossiers that masks sensitive client and financial data for clerc role users';