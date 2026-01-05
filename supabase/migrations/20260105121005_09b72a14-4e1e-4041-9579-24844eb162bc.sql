-- Create a secure view that masks sensitive client data for non-privileged users
-- Admins, collaborateurs, and dossier creators can see all data
-- Participants (clercs) will see NULL for sensitive columns

CREATE OR REPLACE VIEW public.dossiers_secure AS
SELECT 
  id,
  procedure_modele_id,
  status,
  etape_courante_id,
  pourcentage_completion,
  date_creation,
  date_fin,
  created_by,
  nom,
  client_nom,
  client_prenom,
  description,
  notes_retard,
  situation_fiscale,
  created_at,
  updated_at,
  -- Sensitive contact columns - only visible to admins, collaborateurs, and creator
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN client_email
    ELSE NULL
  END AS client_email,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN client_telephone
    ELSE NULL
  END AS client_telephone,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN client_adresse
    ELSE NULL
  END AS client_adresse,
  -- Financial data - only visible to admins, collaborateurs, and creator
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN montant_frais
    ELSE NULL
  END AS montant_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN date_note_frais
    ELSE NULL
  END AS date_note_frais,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN montant_provisions
    ELSE NULL
  END AS montant_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN date_provisions
    ELSE NULL
  END AS date_provisions,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN montant_reglement_partiel
    ELSE NULL
  END AS montant_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN date_reglement_partiel
    ELSE NULL
  END AS date_reglement_partiel,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN montant_solde
    ELSE NULL
  END AS montant_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN date_reglement_solde
    ELSE NULL
  END AS date_reglement_solde,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN montant_depot_capital
    ELSE NULL
  END AS montant_depot_capital,
  CASE 
    WHEN get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'collaborateur'::user_role])
         OR created_by = auth.uid()
    THEN date_depot_capital
    ELSE NULL
  END AS date_depot_capital
FROM public.dossiers;

-- Enable security_invoker so the view respects RLS of the underlying table
ALTER VIEW public.dossiers_secure SET (security_invoker = on);

-- Grant SELECT on the secure view to authenticated users
GRANT SELECT ON public.dossiers_secure TO authenticated;