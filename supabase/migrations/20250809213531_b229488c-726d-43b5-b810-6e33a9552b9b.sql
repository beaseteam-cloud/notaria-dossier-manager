-- Ajouter les nouvelles valeurs au type etape_nature pour les paiements
ALTER TYPE etape_nature ADD VALUE 'paiement_intermediaire';
ALTER TYPE etape_nature ADD VALUE 'paiement_final';

-- Ajouter une colonne pour le montant des étapes de paiement
ALTER TABLE public.etapes_modeles 
ADD COLUMN montant_paiement NUMERIC;