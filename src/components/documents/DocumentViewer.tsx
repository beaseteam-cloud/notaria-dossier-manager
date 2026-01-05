import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Download, FileText, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
  canDelete?: boolean;
  onDeleteSuccess?: () => void;
}

export function DocumentViewer({ documentId, fileName, fileUrl, mimeType, canDelete = false, onDeleteSuccess }: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { user, isCollaborateur } = useAuth();

  // Helper to get file path from stored URL/path
  const getFilePath = (storedUrl: string): string => {
    // If it's a full URL, extract the path
    if (storedUrl.startsWith('http')) {
      const urlParts = storedUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === 'documents');
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        return urlParts.slice(bucketIndex + 1).join('/');
      }
    }
    // Otherwise it's already a path
    return storedUrl;
  };

  const handlePreview = async () => {
    if (!fileUrl) return;

    setLoadingPreview(true);
    try {
      const filePath = getFilePath(fileUrl);
      
      // Create signed URL for preview (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (signedUrlError) {
        console.error('Error creating signed URL for preview:', signedUrlError);
        throw signedUrlError;
      }

      setSignedPreviewUrl(signedUrlData.signedUrl);
      setIsOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        variant: "destructive",
        title: "Erreur d'aperçu",
        description: "Impossible d'afficher l'aperçu du document",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;

    try {
      const filePath = getFilePath(fileUrl);
      
      // Create signed URL for download (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600, {
          download: true
        });

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        throw signedUrlError;
      }

      // Create download link with signed URL
      const link = document.createElement('a');
      link.href = signedUrlData.signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Téléchargement démarré",
        description: `Téléchargement de ${fileName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le document",
      });
    }
  };

  const handleDelete = async () => {
    if (!user || !onDeleteSuccess) return;

    setDeleting(true);
    try {
      console.log('Deleting document:', documentId);

      // First, get the document details to extract the file path
      const { data: docData, error: fetchError } = await supabase
        .from('documents_dossiers')
        .select('fichier_url')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Error fetching document:', fetchError);
        throw fetchError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents_dossiers')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw dbError;
      }

      // Extract file path and delete from storage
      if (docData.fichier_url) {
        const filePath = getFilePath(docData.fichier_url);
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Don't throw here as the database record is already deleted
        }
      }

      console.log('Document deleted successfully');

      toast({
        title: "Document supprimé",
        description: `Le document "${fileName}" a été supprimé avec succès`,
      });

      onDeleteSuccess();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: "Impossible de supprimer le document",
      });
    } finally {
      setDeleting(false);
    }
  };

  const canPreview = mimeType?.startsWith('image/') || mimeType === 'application/pdf';
  const showDeleteButton = canDelete && isCollaborateur;

  return (
    <div className="flex items-center gap-2">
      {canPreview && (
        <>
          <Button size="sm" variant="ghost" onClick={handlePreview} disabled={loadingPreview}>
            <Eye className="w-3 h-3 mr-1" />
            {loadingPreview ? "Chargement..." : "Voir"}
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSignedPreviewUrl(null);
          }}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{fileName}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto">
                {signedPreviewUrl ? (
                  mimeType?.startsWith('image/') ? (
                    <img
                      src={signedPreviewUrl}
                      alt={fileName}
                      className="max-w-full h-auto"
                    />
                  ) : mimeType === 'application/pdf' ? (
                    <iframe
                      src={signedPreviewUrl}
                      className="w-full h-96"
                      title={fileName}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p>Aperçu non disponible pour ce type de fichier</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-8">
                    <p>Chargement de l'aperçu...</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      
      <Button size="sm" variant="ghost" onClick={handleDownload}>
        <Download className="w-3 h-3 mr-1" />
        Télécharger
      </Button>

      {showDeleteButton && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3 mr-1" />
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le document "{fileName}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}