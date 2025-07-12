import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Edit,
  Trash,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  User
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ProcedureModele {
  id: string;
  nom: string;
  description?: string;
  actif: boolean;
  created_at: string;
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

interface NewEtape {
  nom: string;
  description: string;
  delai_prevu: number;
  role_responsable: 'admin' | 'collaborateur' | 'clerc';
  nature: 'interne' | 'externe';
  rappel_automatique: boolean;
  delai_rappel: number;
  documents: DocumentAttenduModele[];
}

interface NewModele {
  nom: string;
  description: string;
  etapes: NewEtape[];
}

export default function Modeles() {
  const { isCollaborateur, profile } = useAuth();
  const [modeles, setModeles] = useState<ProcedureModele[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openModeles, setOpenModeles] = useState<{ [key: string]: boolean }>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newModele, setNewModele] = useState<NewModele>({
    nom: '',
    description: '',
    etapes: []
  });

  const [newEtape, setNewEtape] = useState<NewEtape>({
    nom: '',
    description: '',
    delai_prevu: 7,
    role_responsable: 'clerc',
    nature: 'interne',
    rappel_automatique: true,
    delai_rappel: 1,
    documents: []
  });

  const [newDocument, setNewDocument] = useState<DocumentAttenduModele>({
    nom: '',
    description: '',
    origine: 'externe',
    obligatoire: true
  });

  useEffect(() => {
    fetchModeles();
  }, []);

  const fetchModeles = async () => {
    try {
      console.log('Fetching modeles...');
      
      const { data, error } = await supabase
        .from('procedure_modeles')
        .select(`
          id,
          nom,
          description,
          actif,
          created_at,
          etapes_modeles(
            id,
            nom,
            description,
            ordre,
            delai_prevu,
            role_responsable,
            nature,
            rappel_automatique,
            delai_rappel,
            documents_attendus_modeles(
              id,
              nom,
              description,
              origine,
              obligatoire
            )
          )
        `)
        .order('created_at', { ascending: false });

      console.log('Modeles query result:', { data, error });

      if (error) {
        console.error('Error fetching modeles:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: `Erreur lors du chargement des modèles: ${error.message}`,
        });
      } else {
        setModeles((data as any) || []);
      }
    } catch (error: any) {
      console.error('Error in fetchModeles:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les modèles",
      });
    } finally {
      setLoading(false);
    }
  };

  const addDocumentToEtape = () => {
    if (newDocument.nom.trim()) {
      setNewEtape(prev => ({
        ...prev,
        documents: [...prev.documents, { ...newDocument }]
      }));
      setNewDocument({
        nom: '',
        description: '',
        origine: 'externe',
        obligatoire: true
      });
    }
  };

  const removeDocumentFromEtape = (index: number) => {
    setNewEtape(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const addEtapeToModele = () => {
    if (newEtape.nom.trim()) {
      setNewModele(prev => ({
        ...prev,
        etapes: [...prev.etapes, { ...newEtape }]
      }));
      setNewEtape({
        nom: '',
        description: '',
        delai_prevu: 7,
        role_responsable: 'clerc',
        nature: 'interne',
        rappel_automatique: true,
        delai_rappel: 1,
        documents: []
      });
    }
  };

  const removeEtapeFromModele = (index: number) => {
    setNewModele(prev => ({
      ...prev,
      etapes: prev.etapes.filter((_, i) => i !== index)
    }));
  };

  const createModele = async () => {
    if (!newModele.nom.trim() || newModele.etapes.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez renseigner le nom et au moins une étape",
      });
      return;
    }

    try {
      // Create the procedure model
      const { data: modeleData, error: modeleError } = await supabase
        .from('procedure_modeles')
        .insert({
          nom: newModele.nom,
          description: newModele.description,
          created_by: profile?.user_id
        })
        .select()
        .single();

      if (modeleError) throw modeleError;

      // Create etapes for this model
      for (let i = 0; i < newModele.etapes.length; i++) {
        const etape = newModele.etapes[i];
        
        const { data: etapeData, error: etapeError } = await supabase
          .from('etapes_modeles')
          .insert({
            procedure_modele_id: modeleData.id,
            nom: etape.nom,
            description: etape.description,
            ordre: i + 1,
            delai_prevu: etape.delai_prevu,
            role_responsable: etape.role_responsable,
            nature: etape.nature,
            rappel_automatique: etape.rappel_automatique,
            delai_rappel: etape.delai_rappel
          })
          .select()
          .single();

        if (etapeError) throw etapeError;

        // Create documents for this etape
        for (const doc of etape.documents) {
          const { error: docError } = await supabase
            .from('documents_attendus_modeles')
            .insert({
              etape_modele_id: etapeData.id,
              nom: doc.nom,
              description: doc.description,
              origine: doc.origine,
              obligatoire: doc.obligatoire
            });

          if (docError) throw docError;
        }
      }

      toast({
        title: "Succès",
        description: "Modèle créé avec succès",
      });

      setShowCreateDialog(false);
      setNewModele({ nom: '', description: '', etapes: [] });
      fetchModeles();

    } catch (error: any) {
      console.error('Error creating modele:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la création: ${error.message}`,
      });
    }
  };

  const toggleModele = (id: string) => {
    setOpenModeles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredModeles = modeles.filter(modele =>
    modele.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modèles de procédures</h1>
          <p className="text-muted-foreground">
            Gérez les modèles pour standardiser vos procédures notariales
          </p>
        </div>
        {isCollaborateur && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="notaria-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau modèle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau modèle</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Informations générales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informations générales</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="nom">Nom du modèle *</Label>
                      <Input
                        id="nom"
                        value={newModele.nom}
                        onChange={(e) => setNewModele(prev => ({ ...prev, nom: e.target.value }))}
                        placeholder="ex: Vente immobilière"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newModele.description}
                        onChange={(e) => setNewModele(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description du type de dossier..."
                      />
                    </div>
                  </div>
                </div>

                {/* Nouvelle étape */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">Ajouter une étape</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nom de l'étape *</Label>
                        <Input
                          value={newEtape.nom}
                          onChange={(e) => setNewEtape(prev => ({ ...prev, nom: e.target.value }))}
                          placeholder="ex: Réception du compromis"
                        />
                      </div>
                      <div>
                        <Label>Délai prévu (jours)</Label>
                        <Input
                          type="number"
                          value={newEtape.delai_prevu}
                          onChange={(e) => setNewEtape(prev => ({ ...prev, delai_prevu: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newEtape.description}
                        onChange={(e) => setNewEtape(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description de l'étape..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Responsable</Label>
                        <Select value={newEtape.role_responsable} onValueChange={(value: any) => setNewEtape(prev => ({ ...prev, role_responsable: value }))}>
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
                        <Select value={newEtape.nature} onValueChange={(value: any) => setNewEtape(prev => ({ ...prev, nature: value }))}>
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

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newEtape.rappel_automatique}
                        onCheckedChange={(checked) => setNewEtape(prev => ({ ...prev, rappel_automatique: checked }))}
                      />
                      <Label>Rappel automatique</Label>
                      {newEtape.rappel_automatique && (
                        <div className="flex items-center space-x-2 ml-4">
                          <Label>Délai rappel (jours)</Label>
                          <Input
                            type="number"
                            className="w-20"
                            value={newEtape.delai_rappel}
                            onChange={(e) => setNewEtape(prev => ({ ...prev, delai_rappel: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Documents attendus pour cette étape */}
                    <div className="space-y-3">
                      <Label>Documents attendus pour cette étape</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          value={newDocument.nom}
                          onChange={(e) => setNewDocument(prev => ({ ...prev, nom: e.target.value }))}
                          placeholder="Nom du document"
                        />
                        <Input
                          value={newDocument.description}
                          onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description"
                        />
                        <Select value={newDocument.origine} onValueChange={(value: any) => setNewDocument(prev => ({ ...prev, origine: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="externe">Externe</SelectItem>
                            <SelectItem value="interne">Interne</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={addDocumentToEtape} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {newEtape.documents.length > 0 && (
                        <div className="space-y-2">
                          {newEtape.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div>
                                <span className="font-medium">{doc.nom}</span>
                                {doc.description && <span className="text-sm text-muted-foreground ml-2">- {doc.description}</span>}
                                <Badge variant="outline" className="ml-2">{doc.origine}</Badge>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeDocumentFromEtape(index)}>
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button onClick={addEtapeToModele} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter cette étape
                    </Button>
                  </div>
                </div>

                {/* Étapes ajoutées */}
                {newModele.etapes.length > 0 && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Étapes du modèle ({newModele.etapes.length})</h3>
                    <div className="space-y-3">
                      {newModele.etapes.map((etape, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{index + 1}</Badge>
                                <span className="font-medium">{etape.nom}</span>
                                <Badge className={etape.nature === 'externe' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                  {etape.nature}
                                </Badge>
                                <Badge variant="secondary">{etape.role_responsable}</Badge>
                              </div>
                              {etape.description && (
                                <p className="text-sm text-muted-foreground mt-1">{etape.description}</p>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                Délai: {etape.delai_prevu} jours
                                {etape.rappel_automatique && ` • Rappel: ${etape.delai_rappel} jour(s) avant`}
                                {etape.documents.length > 0 && ` • ${etape.documents.length} document(s)`}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeEtapeFromModele(index)}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 border-t pt-6">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createModele} className="notaria-gradient text-white">
                    Créer le modèle
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Rechercher un modèle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Modeles List */}
      <div className="space-y-4">
        {filteredModeles.map((modele) => (
          <Card key={modele.id} className="notaria-card">
            <CardContent className="p-6">
              <Collapsible 
                open={openModeles[modele.id]} 
                onOpenChange={() => toggleModele(modele.id)}
              >
                <div className="flex items-start justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 text-left flex-1">
                    {openModeles[modele.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{modele.nom}</h3>
                      {modele.description && (
                        <p className="text-sm text-muted-foreground mt-1">{modele.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(modele.created_at)}
                        </span>
                        <Badge className={modele.actif ? 'status-en-cours' : 'status-suspendu'}>
                          {modele.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  {isCollaborateur && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <CollapsibleContent className="mt-4">
                  {modele.etapes_modeles && modele.etapes_modeles.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Étapes ({modele.etapes_modeles.length})</h4>
                      {modele.etapes_modeles
                        .sort((a, b) => a.ordre - b.ordre)
                        .map((etape) => (
                          <div key={etape.id} className="ml-6 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{etape.ordre}</Badge>
                              <span className="font-medium">{etape.nom}</span>
                              <Badge className={etape.nature === 'externe' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                                {etape.nature}
                              </Badge>
                              {etape.role_responsable && (
                                <Badge variant="secondary">{etape.role_responsable}</Badge>
                              )}
                            </div>
                            {etape.description && (
                              <p className="text-sm text-muted-foreground mb-2">{etape.description}</p>
                            )}
                            <div className="text-xs text-muted-foreground mb-2">
                              Délai prévu: {etape.delai_prevu || 'Non défini'} jours
                              {etape.rappel_automatique && ` • Rappel: ${etape.delai_rappel} jour(s) avant`}
                            </div>
                            
                            {etape.documents_attendus_modeles && etape.documents_attendus_modeles.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Documents attendus:</p>
                                <div className="flex flex-wrap gap-1">
                                  {etape.documents_attendus_modeles.map((doc) => (
                                    <Badge key={doc.id} variant="outline" className="text-xs">
                                      <FileText className="w-3 h-3 mr-1" />
                                      {doc.nom}
                                      {doc.obligatoire && '*'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-6">Aucune étape définie</p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))}

        {filteredModeles.length === 0 && (
          <Card className="notaria-card">
            <CardContent className="p-12 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Aucun modèle trouvé</h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? "Aucun modèle ne correspond à votre recherche"
                    : "Créez votre premier modèle pour standardiser vos procédures"
                  }
                </p>
                {isCollaborateur && !searchTerm && (
                  <Button 
                    className="mt-4 notaria-gradient text-white"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un modèle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}