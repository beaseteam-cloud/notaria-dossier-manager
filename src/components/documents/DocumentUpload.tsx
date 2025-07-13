import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface DocumentUploadProps {
  dossierId: string;
  etapeDossierId: string;
  documentAttenduId: string;
  documentNom: string;
  onUploadSuccess: () => void;
}

export function DocumentUpload({ 
  dossierId, 
  etapeDossierId, 
  documentAttenduId, 
  documentNom,
  onUploadSuccess 
}: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Limit file size to 10MB
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Fichier trop volumineux",
          description: "La taille du fichier ne doit pas dépasser 10MB",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}/${documentAttenduId}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading file to storage:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      // Save document record to database
      console.log('Saving document record to database:', {
        dossier_id: dossierId,
        etape_dossier_id: etapeDossierId,
        document_attendu_modele_id: documentAttenduId,
        nom: documentNom,
        fichier_nom: file.name,
        fichier_url: publicUrl,
        type_mime: file.type,
        taille_fichier: file.size,
        uploaded_by: user.id,
      });

      const { data: insertedDoc, error: dbError } = await supabase
        .from('documents_dossiers')
        .insert({
          dossier_id: dossierId,
          etape_dossier_id: etapeDossierId,
          document_attendu_modele_id: documentAttenduId,
          nom: documentNom,
          fichier_nom: file.name,
          fichier_url: publicUrl,
          type_mime: file.type,
          taille_fichier: file.size,
          uploaded_by: user.id,
        })
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      console.log('Document record saved successfully:', insertedDoc);

      toast({
        title: "Document uploadé",
        description: "Le document a été uploadé avec succès",
      });

      setIsOpen(false);
      setFile(null);
      onUploadSuccess();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Erreur d'upload",
        description: "Impossible d'uploader le document",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="w-3 h-3 mr-1" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uploader: {documentNom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formats acceptés: PDF, DOC, DOCX, JPG, PNG (max 10MB)
            </p>
          </div>
          
          {file && (
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Upload en cours..." : "Uploader"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}