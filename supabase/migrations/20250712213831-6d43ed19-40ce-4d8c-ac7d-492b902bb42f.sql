-- Function to create etapes_dossiers when a dossier is created
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
    status
  )
  SELECT 
    NEW.id,
    em.id,
    em.nom,
    em.description,
    em.ordre,
    'en_attente'
  FROM public.etapes_modeles em
  WHERE em.procedure_modele_id = NEW.procedure_modele_id
  ORDER BY em.ordre;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create etapes when a dossier is created
CREATE TRIGGER trigger_create_etapes_for_dossier
  AFTER INSERT ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_etapes_for_dossier();