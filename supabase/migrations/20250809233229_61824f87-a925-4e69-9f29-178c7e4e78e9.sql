-- Ajouter un champ pour tracer qui a terminé une étape
ALTER TABLE public.etapes_dossiers 
ADD COLUMN completed_by uuid REFERENCES auth.users(id);

-- Ajouter un champ pour la date de completion
ALTER TABLE public.etapes_dossiers 
ADD COLUMN completed_at timestamp with time zone;

-- Créer une fonction pour enregistrer automatiquement les actions dans activity_logs
CREATE OR REPLACE FUNCTION public.log_etape_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Créer le trigger pour les étapes
CREATE TRIGGER log_etape_completion_trigger
  BEFORE UPDATE ON public.etapes_dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_etape_completion();

-- Créer une fonction pour enregistrer les uploads de documents
CREATE OR REPLACE FUNCTION public.log_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Créer le trigger pour les documents
CREATE TRIGGER log_document_upload_trigger
  AFTER INSERT ON public.documents_dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_upload();