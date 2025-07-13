-- Create missing etapes for existing dossiers that don't have any
INSERT INTO public.etapes_dossiers (
  dossier_id,
  etape_modele_id,
  nom,
  description,
  ordre,
  status
)
SELECT 
  d.id,
  em.id,
  em.nom,
  em.description,
  em.ordre,
  'en_attente'
FROM public.dossiers d
JOIN public.etapes_modeles em ON em.procedure_modele_id = d.procedure_modele_id
LEFT JOIN public.etapes_dossiers ed ON ed.dossier_id = d.id
WHERE ed.id IS NULL
ORDER BY d.id, em.ordre;