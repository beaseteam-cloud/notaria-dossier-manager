-- Modifier la fonction pour calculer la date_fin_prevue
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
    -- Calculer date_fin_prevue : date_creation + delai_prevu (si delai_prevu existe)
    CASE 
      WHEN em.delai_prevu IS NOT NULL THEN NEW.date_creation + (em.delai_prevu || ' days')::interval
      ELSE NULL
    END
  FROM public.etapes_modeles em
  WHERE em.procedure_modele_id = NEW.procedure_modele_id
  ORDER BY em.ordre;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour recalculer date_fin_prevue quand une étape commence
CREATE OR REPLACE FUNCTION public.update_etape_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'étape passe à 'en_cours' et qu'on a une date_debut
  IF NEW.status = 'en_cours' AND NEW.date_debut IS NOT NULL AND OLD.status != 'en_cours' THEN
    -- Récupérer le delai_prevu du modèle d'étape
    SELECT 
      CASE 
        WHEN em.delai_prevu IS NOT NULL THEN NEW.date_debut + (em.delai_prevu || ' days')::interval
        ELSE NEW.date_fin_prevue -- Garder l'ancienne valeur si pas de délai
      END
    INTO NEW.date_fin_prevue
    FROM public.etapes_modeles em
    WHERE em.id = NEW.etape_modele_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour les dates
DROP TRIGGER IF EXISTS trigger_update_etape_dates ON public.etapes_dossiers;
CREATE TRIGGER trigger_update_etape_dates
  BEFORE UPDATE ON public.etapes_dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_etape_dates();