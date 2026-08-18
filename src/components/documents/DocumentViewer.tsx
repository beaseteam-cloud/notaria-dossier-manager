import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Download, Trash2 } from 'lucide-react';
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

  // Infer type from extension when mimeType is missing/incorrect
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
  const isPdf = mimeType === 'application/pdf' || extension === 'pdf';
  const isText = mimeType?.startsWith('text/') || ['txt', 'csv', 'json', 'md'].includes(extension);
  // Documents Office : rendus via la visionneuse Office Online (nécessite un accès internet)
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);
  const isInlineViewable = isImage || isPdf || isText || isOffice;


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

      if (isInlineViewable) {
        setSignedPreviewUrl(signedUrlData.signedUrl);
        setIsOpen(true);
      } else {
        // Types non affichables dans le navigateur : ouverture dans un nouvel onglet
        window.open(signedUrlData.signedUrl, '_blank', 'noopener,noreferrer');
      }

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

  const showDeleteButton = canDelete && isCollaborateur;

  return (
    <div className="flex items-center gap-2">
      {fileUrl && (
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
                  isImage ? (
                    <img
                      src={signedPreviewUrl}
                      alt={fileName}
                      className="max-w-full h-auto"
                    />
                  ) : (
                    <div className="space-y-2">
                      <iframe
                        src={isOffice
                          ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedPreviewUrl)}`
                          : signedPreviewUrl}
                        className="w-full h-[65vh]"
                        title={fileName}
                      />
                      {isOffice && (
                        <p className="text-xs text-muted-foreground">
                          Aperçu fourni par la visionneuse Office Online.{' '}
                          <button
                            type="button"
                            className="underline"
                            onClick={() => window.open(signedPreviewUrl, '_blank', 'noopener,noreferrer')}
                          >
                            Ouvrir le fichier dans un nouvel onglet
                          </button>
                        </p>
                      )}
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