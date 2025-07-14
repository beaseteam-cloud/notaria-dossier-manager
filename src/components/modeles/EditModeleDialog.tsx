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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash, Plus, Save, X } from 'lucide-react';
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

  const [etapes, setEtapes] = useState<EtapeModele[]>([]);
  const [editingEtape, setEditingEtape] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<{ etapeId: string; docId?: string } | null>(null);
  const [newDocument, setNewDocument] = useState<DocumentAttenduModele>({
    nom: '',
    description: '',
    origine: 'externe',
    obligatoire: true
  });

  useEffect(() => {
    if (modele) {
      setFormData({
        nom: modele.nom,
        description: modele.description || '',
        actif: modele.actif
      });
      setEtapes(modele.etapes_modeles || []);
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
      // Update modele
      const { error: modeleError } = await supabase
        .from('procedure_modeles')
        .update({
          nom: formData.nom,
          description: formData.description,
          actif: formData.actif,
          updated_at: new Date().toISOString()
        })
        .eq('id', modele.id);

      if (modeleError) throw modeleError;

      // Update etapes
      for (const etape of etapes) {
        const { error: etapeError } = await supabase
          .from('etapes_modeles')
          .update({
            nom: etape.nom,
            description: etape.description,
            delai_prevu: etape.delai_prevu,
            role_responsable: etape.role_responsable,
            nature: etape.nature,
            rappel_automatique: etape.rappel_automatique,
            delai_rappel: etape.delai_rappel
          })
          .eq('id', etape.id);

        if (etapeError) throw etapeError;

        // Update documents for this etape
        if (etape.documents_attendus_modeles) {
          for (const doc of etape.documents_attendus_modeles) {
            if (doc.id) {
              const { error: docError } = await supabase
                .from('documents_attendus_modeles')
                .update({
                  nom: doc.nom,
                  description: doc.description,
                  origine: doc.origine,
                  obligatoire: doc.obligatoire
                })
                .eq('id', doc.id);

              if (docError) throw docError;
            }
          }
        }
      }

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

  const updateEtape = (etapeId: string, field: string, value: any) => {
    setEtapes(prev => prev.map(etape => 
      etape.id === etapeId ? { ...etape, [field]: value } : etape
    ));
  };

  const updateDocument = (etapeId: string, docId: string, field: string, value: any) => {
    setEtapes(prev => prev.map(etape => 
      etape.id === etapeId 
        ? {
            ...etape,
            documents_attendus_modeles: etape.documents_attendus_modeles?.map(doc =>
              doc.id === docId ? { ...doc, [field]: value } : doc
            )
          }
        : etape
    ));
  };

  const addDocument = async (etapeId: string) => {
    if (!newDocument.nom.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom du document est obligatoire",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('documents_attendus_modeles')
        .insert({
          etape_modele_id: etapeId,
          nom: newDocument.nom,
          description: newDocument.description,
          origine: newDocument.origine,
          obligatoire: newDocument.obligatoire
        })
        .select()
        .single();

      if (error) throw error;

      setEtapes(prev => prev.map(etape => 
        etape.id === etapeId 
          ? {
              ...etape,
              documents_attendus_modeles: [...(etape.documents_attendus_modeles || []), data]
            }
          : etape
      ));

      setNewDocument({
        nom: '',
        description: '',
        origine: 'externe',
        obligatoire: true
      });

      setEditingDocument(null);

      toast({
        title: "Succès",
        description: "Document ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Error adding document:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout: ${error.message}`,
      });
    }
  };

  const deleteDocument = async (etapeId: string, docId: string) => {
    try {
      const { error } = await supabase
        .from('documents_attendus_modeles')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setEtapes(prev => prev.map(etape => 
        etape.id === etapeId 
          ? {
              ...etape,
              documents_attendus_modeles: etape.documents_attendus_modeles?.filter(doc => doc.id !== docId)
            }
          : etape
      ));

      toast({
        title: "Succès",
        description: "Document supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la suppression: ${error.message}`,
      });
    }
  };

  const addNewEtape = async () => {
    if (!modele) return;

    const nextOrdre = Math.max(...etapes.map(e => e.ordre), 0) + 1;
    
    try {
      const { data, error } = await supabase
        .from('etapes_modeles')
        .insert({
          procedure_modele_id: modele.id,
          nom: `Nouvelle étape ${nextOrdre}`,
          description: '',
          ordre: nextOrdre,
          nature: 'interne',
          rappel_automatique: false,
          delai_rappel: 1
        })
        .select()
        .single();

      if (error) throw error;

      const newEtape: EtapeModele = {
        ...data,
        documents_attendus_modeles: []
      };

      setEtapes(prev => [...prev, newEtape]);
      setEditingEtape(data.id);

      toast({
        title: "Succès",
        description: "Nouvelle étape ajoutée",
      });
    } catch (error: any) {
      console.error('Error adding etape:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de l'ajout: ${error.message}`,
      });
    }
  };

  if (!modele) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le modèle</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Étapes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Étapes du modèle ({etapes.length})
                <Button
                  onClick={addNewEtape}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une étape
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-4">
                {etapes
                  .sort((a, b) => a.ordre - b.ordre)
                  .map((etape) => (
                    <AccordionItem key={etape.id} value={etape.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{etape.ordre}. {etape.nom}</span>
                            <Badge variant="outline">{etape.nature}</Badge>
                            <Badge variant="secondary">{etape.role_responsable}</Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        {editingEtape === etape.id ? (
                          <div className="space-y-4 p-4 border rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Nom de l'étape</Label>
                                <Input
                                  value={etape.nom}
                                  onChange={(e) => updateEtape(etape.id, 'nom', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label>Délai prévu (jours)</Label>
                                <Input
                                  type="number"
                                  value={etape.delai_prevu || ''}
                                  onChange={(e) => updateEtape(etape.id, 'delai_prevu', parseInt(e.target.value) || null)}
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={etape.description || ''}
                                onChange={(e) => updateEtape(etape.id, 'description', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Responsable</Label>
                                <Select 
                                  value={etape.role_responsable || ''} 
                                  onValueChange={(value) => updateEtape(etape.id, 'role_responsable', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="clerc">Clerc</SelectItem>
                                    <SelectItem value="collaborateur">Collaborateur</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Nature</Label>
                                <Select 
                                  value={etape.nature} 
                                  onValueChange={(value: any) => updateEtape(etape.id, 'nature', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="interne">Interne</SelectItem>
                                    <SelectItem value="externe">Externe</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={etape.rappel_automatique}
                                  onCheckedChange={(checked) => updateEtape(etape.id, 'rappel_automatique', checked)}
                                />
                                <Label>Rappel automatique</Label>
                              </div>
                              {etape.rappel_automatique && (
                                <div className="flex items-center space-x-2">
                                  <Label>Délai rappel (jours)</Label>
                                  <Input
                                    type="number"
                                    className="w-20"
                                    value={etape.delai_rappel || ''}
                                    onChange={(e) => updateEtape(etape.id, 'delai_rappel', parseInt(e.target.value) || 1)}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={() => setEditingEtape(null)} size="sm">
                                <Save className="w-4 h-4 mr-2" />
                                Sauvegarder
                              </Button>
                              <Button onClick={() => setEditingEtape(null)} variant="outline" size="sm">
                                <X className="w-4 h-4 mr-2" />
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                {etape.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{etape.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Délai prévu: {etape.delai_prevu || 'Non défini'} jours
                                  {etape.rappel_automatique && ` • Rappel: ${etape.delai_rappel} jour(s) avant`}
                                </p>
                              </div>
                              <Button
                                onClick={() => setEditingEtape(etape.id)}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </Button>
                            </div>

                            {/* Documents de l'étape */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Documents attendus</Label>
                                <Button
                                  onClick={() => setEditingDocument({ etapeId: etape.id })}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Ajouter un document
                                </Button>
                              </div>

                              {editingDocument?.etapeId === etape.id && !editingDocument.docId && (
                                <div className="p-4 border rounded-lg space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Nom du document</Label>
                                      <Input
                                        value={newDocument.nom}
                                        onChange={(e) => setNewDocument(prev => ({ ...prev, nom: e.target.value }))}
                                        placeholder="Nom du document"
                                      />
                                    </div>
                                    <div>
                                      <Label>Origine</Label>
                                      <Select 
                                        value={newDocument.origine} 
                                        onValueChange={(value: any) => setNewDocument(prev => ({ ...prev, origine: value }))}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="externe">Externe</SelectItem>
                                          <SelectItem value="interne">Interne</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Description</Label>
                                    <Input
                                      value={newDocument.description}
                                      onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                                      placeholder="Description du document"
                                    />
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={newDocument.obligatoire}
                                      onCheckedChange={(checked) => setNewDocument(prev => ({ ...prev, obligatoire: checked }))}
                                    />
                                    <Label>Document obligatoire</Label>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button onClick={() => addDocument(etape.id)} size="sm">
                                      Ajouter
                                    </Button>
                                    <Button onClick={() => setEditingDocument(null)} variant="outline" size="sm">
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                {etape.documents_attendus_modeles?.map((doc) => (
                                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                                    {editingDocument?.docId === doc.id ? (
                                      <div className="flex-1 space-y-2">
                                        <Input
                                          value={doc.nom}
                                          onChange={(e) => updateDocument(etape.id, doc.id!, 'nom', e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                          <Button onClick={() => setEditingDocument(null)} size="sm">
                                            Sauvegarder
                                          </Button>
                                          <Button onClick={() => setEditingDocument(null)} variant="outline" size="sm">
                                            Annuler
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{doc.nom}</span>
                                          <Badge variant={doc.obligatoire ? "destructive" : "outline"}>
                                            {doc.obligatoire ? "Obligatoire" : "Optionnel"}
                                          </Badge>
                                          <Badge variant="secondary">{doc.origine}</Badge>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            onClick={() => setEditingDocument({ etapeId: etape.id, docId: doc.id })}
                                            variant="ghost"
                                            size="sm"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            onClick={() => deleteDocument(etape.id, doc.id!)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </CardContent>
          </Card>
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