import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FreeDocumentUploadProps {
  dossierId: string;
  onUploadSuccess: () => void;
}

export function FreeDocumentUpload({ dossierId, onUploadSuccess }: FreeDocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Allowed MIME types for document uploads
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ];

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
      
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Type de fichier non autorisé",
          description: "Formats acceptés: PDF, DOC, DOCX, JPG, PNG",
        });
        return;
      }
      
      setFile(selectedFile);
      // Auto-fill document name with file name if empty
      if (!documentName) {
        const nameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
        setDocumentName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !documentName.trim()) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez sélectionner un fichier et saisir un nom de document",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}/free-docs/${Date.now()}.${fileExt}`;
      
      console.log('Uploading free document to storage:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Store the file path (not public URL) since bucket is private
      const filePath = fileName;

      console.log('Storing file path:', filePath);

      // Save document record to database with file path
      const documentData = {
        dossier_id: dossierId,
        nom: documentName.trim(),
        description: description.trim() || null,
        fichier_nom: file.name,
        fichier_url: filePath,
        type_mime: file.type,
        taille_fichier: file.size,
        uploaded_by: user.id,
      };

      console.log('Saving free document record to database:', documentData);

      const { data: insertedDoc, error: dbError } = await supabase
        .from('documents_dossiers')
        .insert(documentData)
        .select();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      console.log('Free document record saved successfully:', insertedDoc);

      toast({
        title: "Document ajouté",
        description: `Le document "${documentName}" a été ajouté avec succès`,
      });

      // Reset form
      setIsOpen(false);
      setFile(null);
      setDocumentName('');
      setDescription('');
      onUploadSuccess();
    } catch (error: any) {
      console.error('Error uploading free document:', error);
      toast({
        variant: "destructive",
        title: "Erreur d'upload",
        description: "Impossible d'ajouter le document",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document au dossier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="document-name">Nom du document *</Label>
            <Input
              id="document-name"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Ex: Contrat de vente, Pièce d'identité..."
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du document..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="file">Fichier *</Label>
            <Input
              id="file"
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
              disabled={!file || !documentName.trim() || uploading}
            >
              {uploading ? "Ajout en cours..." : "Ajouter le document"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}