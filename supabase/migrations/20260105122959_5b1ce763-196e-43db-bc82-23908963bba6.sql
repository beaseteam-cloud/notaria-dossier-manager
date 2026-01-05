-- Fix remaining SECURITY DEFINER functions with search_path

CREATE OR REPLACE FUNCTION public.log_etape_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  user_profile RECORD;
BEGIN
  -- Si l'étape vient d'être marquée comme terminée
  IF NEW.status = 'termine' AND OLD.status != 'termine' THEN
    -- Mettre à jour qui a terminé et quand
    NEW.completed_by = auth.uid();
    NEW.completed_at = now();
    
    -- Récupérer les infos du profil utilisateur
    SELECT nom, prenom, role INTO user_profile
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Enregistrer dans les logs d'activité
    INSERT INTO public.activity_logs (
      user_id,
      dossier_id,
      action,
      details
    ) VALUES (
      auth.uid(),
      NEW.dossier_id,
      'etape_completed',
      jsonb_build_object(
        'etape_id', NEW.id,
        'etape_nom', NEW.nom,
        'user_nom', user_profile.nom,
        'user_prenom', user_profile.prenom,
        'user_role', user_profile.role
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  user_profile RECORD;
BEGIN
  -- Récupérer les infos du profil utilisateur
  SELECT nom, prenom, role INTO user_profile
  FROM public.profiles 
  WHERE user_id = NEW.uploaded_by;
  
  -- Enregistrer dans les logs d'activité
  INSERT INTO public.activity_logs (
    user_id,
    dossier_id,
    action,
    details
  ) VALUES (
    NEW.uploaded_by,
    NEW.dossier_id,
    'document_uploaded',
    jsonb_build_object(
      'document_id', NEW.id,
      'document_nom', NEW.nom,
      'user_nom', user_profile.nom,
      'user_prenom', user_profile.prenom,
      'user_role', user_profile.role
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_etapes_for_dossier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
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
    NULL
  FROM public.etapes_modeles em
  WHERE em.procedure_modele_id = NEW.procedure_modele_id
  ORDER BY em.ordre;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_etape_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  -- Si l'étape passe à 'en_cours' et qu'on a une date_debut
  IF NEW.status = 'en_cours' AND NEW.date_debut IS NOT NULL AND OLD.status != 'en_cours' THEN
    -- Récupérer le delai_prevu du modèle d'étape
    SELECT 
      CASE 
        WHEN em.delai_prevu IS NOT NULL THEN NEW.date_debut + (em.delai_prevu || ' days')::interval
        ELSE NEW.date_fin_prevue
      END
    INTO NEW.date_fin_prevue
    FROM public.etapes_modeles em
    WHERE em.id = NEW.etape_modele_id;
  END IF;
  
  RETURN NEW;
END;
$function$;