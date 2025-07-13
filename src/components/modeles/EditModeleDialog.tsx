import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProcedureModele {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  etapes_modeles?: EtapeModele[];
}

interface EtapeModele {
  id: string;
  nom: string;
  description?: string;
  ordre: number;
  delai_prevu?: number;
  role_responsable?: 'admin' | 'collaborateur' | 'clerc';
  nature: 'interne' | 'externe';
  rappel_automatique: boolean;
  delai_rappel?: number;
  documents_attendus_modeles?: DocumentAttenduModele[];
}

interface DocumentAttenduModele {
  id?: string;
  nom: string;
  description?: string;
  origine: 'interne' | 'externe';
  obligatoire: boolean;
}

interface EditModeleDialogProps {
  modele: ProcedureModele | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditModeleDialog({ modele, open, onOpenChange, onSuccess }: EditModeleDialogProps) {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    actif: true
  });

  useEffect(() => {
    if (modele) {
      setFormData({
        nom: modele.nom,
        description: modele.description || '',
        actif: modele.actif
      });
    }
  }, [modele]);

  const handleSubmit = async () => {
    if (!modele || !formData.nom.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom est obligatoire",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('procedure_modeles')
        .update({
          nom: formData.nom,
          description: formData.description,
          actif: formData.actif,
          updated_at: new Date().toISOString()
        })
        .eq('id', modele.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Modèle mis à jour avec succès",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating modele:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error.message}`,
      });
    }
  };

  if (!modele) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le modèle</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-nom">Nom du modèle *</Label>
            <Input
              id="edit-nom"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Nom du modèle"
            />
          </div>
          
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description du modèle"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.actif}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, actif: checked }))}
            />
            <Label>Modèle actif</Label>
          </div>

          {modele.etapes_modeles && modele.etapes_modeles.length > 0 && (
            <div className="space-y-2">
              <Label>Étapes du modèle ({modele.etapes_modeles.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {modele.etapes_modeles
                  .sort((a, b) => a.ordre - b.ordre)
                  .map((etape) => (
                    <div key={etape.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{etape.ordre}. {etape.nom}</span>
                        {etape.description && (
                          <p className="text-sm text-muted-foreground">{etape.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{etape.nature}</Badge>
                        <Badge variant="secondary">{etape.role_responsable}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}