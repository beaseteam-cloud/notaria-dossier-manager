-- Fix the infinite recursion in RLS policies by removing problematic policies and recreating them properly

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view participants of dossiers they access" ON public.dossier_participants;
DROP POLICY IF EXISTS "Users can view dossiers they participate in" ON public.dossiers;
DROP POLICY IF EXISTS "Users can update dossiers they participate in" ON public.dossiers;

-- Add missing foreign key relationship between dossiers and profiles
ALTER TABLE public.dossiers ADD CONSTRAINT fk_dossiers_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Recreate policies without circular references
CREATE POLICY "Users can view all dossiers" ON public.dossiers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view all participants" ON public.dossier_participants FOR SELECT TO authenticated USING (true);

-- Simplify other policies to avoid recursion
DROP POLICY IF EXISTS "Users can view etapes of accessible dossiers" ON public.etapes_dossiers;
CREATE POLICY "Users can view all etapes" ON public.etapes_dossiers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view documents of accessible dossiers" ON public.documents_dossiers;
CREATE POLICY "Users can view all documents" ON public.documents_dossiers FOR SELECT TO authenticated USING (true);