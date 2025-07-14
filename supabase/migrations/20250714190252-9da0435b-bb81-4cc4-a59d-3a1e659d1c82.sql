-- Correction manuelle du dossier framboise qui est à 100% mais toujours en cours
UPDATE dossiers 
SET 
  status = 'termine',
  date_fin = now(),
  updated_at = now()
WHERE nom = 'framboise' AND pourcentage_completion = 100 AND status = 'en_cours';