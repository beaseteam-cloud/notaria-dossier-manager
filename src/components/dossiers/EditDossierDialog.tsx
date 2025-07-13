import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Dossier {
  id: string;
  nom: string;
  description?: string;
  client_nom: string;
  client_prenom?: string;
  client_email?: string;
  client_telephone?: string;
  client_adresse?: string;
  situation_fiscale?: string;
  status: 'en_cours' | 'termine' | 'suspendu';
  montant_frais?: number;
  montant_provisions?: number;
  montant_depot_capital?: number;
  montant_reglement_partiel?: number;
  montant_solde?: number;
  notes_retard?: string;
}

interface EditDossierDialogProps {
  dossier: Dossier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDossierDialog({ dossier, open, onOpenChange, onSuccess }: EditDossierDialogProps) {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    client_nom: '',
    client_prenom: '',
    client_email: '',
    client_telephone: '',
    client_adresse: '',
    situation_fiscale: '',
    status: 'en_cours' as 'en_cours' | 'termine' | 'suspendu',
    montant_frais: '',
    montant_provisions: '',
    montant_depot_capital: '',
    montant_reglement_partiel: '',
    montant_solde: '',
    notes_retard: ''
  });

  useEffect(() => {
    if (dossier) {
      setFormData({
        nom: dossier.nom,
        description: dossier.description || '',
        client_nom: dossier.client_nom,
        client_prenom: dossier.client_prenom || '',
        client_email: dossier.client_email || '',
        client_telephone: dossier.client_telephone || '',
        client_adresse: dossier.client_adresse || '',
        situation_fiscale: dossier.situation_fiscale || '',
        status: dossier.status,
        montant_frais: dossier.montant_frais?.toString() || '',
        montant_provisions: dossier.montant_provisions?.toString() || '',
        montant_depot_capital: dossier.montant_depot_capital?.toString() || '',
        montant_reglement_partiel: dossier.montant_reglement_partiel?.toString() || '',
        montant_solde: dossier.montant_solde?.toString() || '',
        notes_retard: dossier.notes_retard || ''
      });
    }
  }, [dossier]);

  const handleSubmit = async () => {
    if (!dossier || !formData.nom.trim() || !formData.client_nom.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom du dossier et le nom du client sont obligatoires",
      });
      return;
    }

    try {
      const updateData: any = {
        nom: formData.nom,
        description: formData.description || null,
        client_nom: formData.client_nom,
        client_prenom: formData.client_prenom || null,
        client_email: formData.client_email || null,
        client_telephone: formData.client_telephone || null,
        client_adresse: formData.client_adresse || null,
        situation_fiscale: formData.situation_fiscale || null,
        status: formData.status,
        notes_retard: formData.notes_retard || null,
        updated_at: new Date().toISOString()
      };

      // Handle numeric fields
      if (formData.montant_frais) {
        updateData.montant_frais = parseFloat(formData.montant_frais);
      }
      if (formData.montant_provisions) {
        updateData.montant_provisions = parseFloat(formData.montant_provisions);
      }
      if (formData.montant_depot_capital) {
        updateData.montant_depot_capital = parseFloat(formData.montant_depot_capital);
      }
      if (formData.montant_reglement_partiel) {
        updateData.montant_reglement_partiel = parseFloat(formData.montant_reglement_partiel);
      }
      if (formData.montant_solde) {
        updateData.montant_solde = parseFloat(formData.montant_solde);
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', dossier.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dossier mis à jour avec succès",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating dossier:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la mise à jour: ${error.message}`,
      });
    }
  };

  if (!dossier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le dossier</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-nom">Nom du dossier *</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom du dossier"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Statut</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du dossier"
                rows={3}
              />
            </div>
          </div>

          {/* Informations client */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-client-nom">Nom du client *</Label>
                <Input
                  id="edit-client-nom"
                  value={formData.client_nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <Label htmlFor="edit-client-prenom">Prénom</Label>
                <Input
                  id="edit-client-prenom"
                  value={formData.client_prenom}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_prenom: e.target.value }))}
                  placeholder="Prénom du client"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-client-email">Email</Label>
                <Input
                  id="edit-client-email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-client-telephone">Téléphone</Label>
                <Input
                  id="edit-client-telephone"
                  value={formData.client_telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_telephone: e.target.value }))}
                  placeholder="01 23 45 67 89"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-client-adresse">Adresse</Label>
              <Textarea
                id="edit-client-adresse"
                value={formData.client_adresse}
                onChange={(e) => setFormData(prev => ({ ...prev, client_adresse: e.target.value }))}
                placeholder="Adresse complète du client"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-situation-fiscale">Situation fiscale</Label>
              <Input
                id="edit-situation-fiscale"
                value={formData.situation_fiscale}
                onChange={(e) => setFormData(prev => ({ ...prev, situation_fiscale: e.target.value }))}
                placeholder="Situation fiscale du client"
              />
            </div>
          </div>

          {/* Informations financières */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations financières</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-montant-frais">Montant des frais (€)</Label>
                <Input
                  id="edit-montant-frais"
                  type="number"
                  step="0.01"
                  value={formData.montant_frais}
                  onChange={(e) => setFormData(prev => ({ ...prev, montant_frais: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-montant-provisions">Montant des provisions (€)</Label>
                <Input
                  id="edit-montant-provisions"
                  type="number"
                  step="0.01"
                  value={formData.montant_provisions}
                  onChange={(e) => setFormData(prev => ({ ...prev, montant_provisions: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-montant-depot">Montant dépôt de capital (€)</Label>
                <Input
                  id="edit-montant-depot"
                  type="number"
                  step="0.01"
                  value={formData.montant_depot_capital}
                  onChange={(e) => setFormData(prev => ({ ...prev, montant_depot_capital: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-montant-partiel">Règlement partiel (€)</Label>
                <Input
                  id="edit-montant-partiel"
                  type="number"
                  step="0.01"
                  value={formData.montant_reglement_partiel}
                  onChange={(e) => setFormData(prev => ({ ...prev, montant_reglement_partiel: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-montant-solde">Solde (€)</Label>
              <Input
                id="edit-montant-solde"
                type="number"
                step="0.01"
                value={formData.montant_solde}
                onChange={(e) => setFormData(prev => ({ ...prev, montant_solde: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes de retard */}
          <div>
            <Label htmlFor="edit-notes-retard">Notes de retard</Label>
            <Textarea
              id="edit-notes-retard"
              value={formData.notes_retard}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_retard: e.target.value }))}
              placeholder="Notes concernant les retards éventuels"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            Enregistrer les modifications
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}