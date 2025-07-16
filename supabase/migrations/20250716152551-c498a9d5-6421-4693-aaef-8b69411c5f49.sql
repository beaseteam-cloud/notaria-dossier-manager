-- Modifier la fonction pour ne pas calculer date_fin_prevue à la création
-- Elle sera calculée uniquement quand l'étape commence (statut = 'en_cours')
CREATE OR REPLACE FUNCTION public.create_etapes_for_dossier()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert etapes based on the procedure modele
  INSERT INTO public.etapes_dossiers (
    dossier_id,
    etape_modele_id,
    nom,
    description,
    ordre,
    status,
    date_fin_prevue
  )
  SELECT 
    NEW.id,
    em.id,
    em.nom,
    em.description,
    em.ordre,
    'en_attente',
    -- Ne pas calculer date_fin_prevue à la création, elle sera calculée quand l'étape commence
    NULL
  FROM public.etapes_modeles em
  WHERE em.procedure_modele_id = NEW.procedure_modele_id
  ORDER BY em.ordre;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;