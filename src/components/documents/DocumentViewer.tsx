import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentViewerProps {
  documentId: string;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
}

export function DocumentViewer({ documentId, fileName, fileUrl, mimeType }: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async () => {
    if (!fileUrl) return;

    try {
      // Create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Téléchargement démarré",
        description: `Téléchargement de ${fileName}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le document",
      });
    }
  };

  const canPreview = mimeType?.startsWith('image/') || mimeType === 'application/pdf';

  return (
    <div className="flex items-center gap-2">
      {canPreview && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Eye className="w-3 h-3 mr-1" />
              Voir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{fileName}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {mimeType?.startsWith('image/') ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full h-auto"
                />
              ) : mimeType === 'application/pdf' ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-96"
                  title={fileName}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p>Aperçu non disponible pour ce type de fichier</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <Button size="sm" variant="ghost" onClick={handleDownload}>
        <Download className="w-3 h-3 mr-1" />
        Télécharger
      </Button>
    </div>
  );
}