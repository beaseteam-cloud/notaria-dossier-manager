-- Make documents bucket public for easier access
UPDATE storage.buckets SET public = true WHERE id = 'documents';

-- Create storage policies for documents bucket
-- Users can view documents they have access to via RLS on documents_dossiers
CREATE POLICY "Users can view documents from accessible dossiers"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents_dossiers dd
    JOIN public.dossiers d ON d.id = dd.dossier_id
    WHERE dd.fichier_url LIKE '%' || storage.objects.name || '%'
    AND (
      EXISTS (
        SELECT 1 FROM public.dossier_participants dp
        WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()
      )
      OR d.created_by = auth.uid()
      OR public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role])
    )
  )
);

-- Users can upload documents to accessible dossiers
CREATE POLICY "Users can upload documents to accessible dossiers"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role])
);

-- Users can update documents they uploaded
CREATE POLICY "Users can update their uploaded documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents_dossiers dd
    WHERE dd.fichier_url LIKE '%' || storage.objects.name || '%'
    AND dd.uploaded_by = auth.uid()
  )
);

-- Update documents_dossiers policies to allow updates
DROP POLICY IF EXISTS "Users can upload documents to accessible dossiers" ON public.documents_dossiers;
DROP POLICY IF EXISTS "Users can view all documents" ON public.documents_dossiers;

-- Users can view documents from accessible dossiers
CREATE POLICY "Users can view documents from accessible dossiers"
ON public.documents_dossiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = documents_dossiers.dossier_id
    AND (
      EXISTS (
        SELECT 1 FROM public.dossier_participants dp
        WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()
      )
      OR d.created_by = auth.uid()
      OR public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role])
    )
  )
);

-- Users can upload documents to accessible dossiers
CREATE POLICY "Users can upload documents to accessible dossiers"
ON public.documents_dossiers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = documents_dossiers.dossier_id
    AND (
      EXISTS (
        SELECT 1 FROM public.dossier_participants dp
        WHERE dp.dossier_id = d.id AND dp.user_id = auth.uid()
      )
      OR d.created_by = auth.uid()
      OR public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role])
    )
  )
);

-- Users can update documents they uploaded
CREATE POLICY "Users can update their uploaded documents"
ON public.documents_dossiers
FOR UPDATE
USING (uploaded_by = auth.uid() OR public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role]));

-- Users can delete documents they uploaded
CREATE POLICY "Users can delete their uploaded documents"
ON public.documents_dossiers
FOR DELETE
USING (uploaded_by = auth.uid() OR public.get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'collaborateur'::user_role]));