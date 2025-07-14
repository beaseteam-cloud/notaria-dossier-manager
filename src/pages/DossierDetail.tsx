import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle, 
  Clock, 
  FileText,
  User,
  Calendar,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { FreeDocumentUpload } from '@/components/documents/FreeDocumentUpload';
import { EditDossierDialog } from '@/components/dossiers/EditDossierDialog';

interface DossierDetail {
  id: string;
  nom: string;
  client_nom: string;
  client_prenom?: string;
  description?: string;
  status: 'en_cours' | 'termine' | 'suspendu';
  pourcentage_completion: number;
  date_creation: string;
  montant_frais?: number;
  procedure_modeles?: {
    nom: string;
  };
}

interface EtapeDossier {
  id: string;
  nom: string;
  description?: string;
  status: string;
  ordre: number;
  date_debut?: string;
  date_fin_prevue?: string;
  date_fin_reelle?: string;
  etape_modele_id: string;
  assignee_id?: string;
  notes?: string;
}

interface DocumentAttendu {
  id: string;
  nom: string;
  description?: string;
  obligatoire: boolean;
  etape_modele_id: string;
}

interface DocumentDossier {
  id: string;
  nom: string;
  fichier_url?: string;
  fichier_nom?: string;
  date_upload: string;
  document_attendu_modele_id?: string;
  type_mime?: string;
  taille_fichier?: number;
}

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isCollaborateur } = useAuth();
  const [dossier, setDossier] = useState<DossierDetail | null>(null);
  const [etapes, setEtapes] = useState<EtapeDossier[]>([]);
  const [documentsAttendus, setDocumentsAttendus] = useState<DocumentAttendu[]>([]);
  const [documentsUploads, setDocumentsUploads] = useState<DocumentDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDossierDetail();
    }
  }, [id]);

  const fetchDossierDetail = async () => {
    try {
      // Fetch dossier details
      const { data: dossierData, error: dossierError } = await supabase
        .from('dossiers')
        .select(`
          id,
          nom,
          client_nom,
          client_prenom,
          description,
          status,
          pourcentage_completion,
          date_creation,
          montant_frais,
          procedure_modeles(nom)
        `)
        .eq('id', id)
        .single();

      if (dossierError) throw dossierError;
      setDossier(dossierData);

      // Fetch etapes for this dossier
      const { data: etapesData, error: etapesError } = await supabase
        .from('etapes_dossiers')
        .select('*')
        .eq('dossier_id', id)
        .order('ordre');

      if (etapesError) throw etapesError;
      setEtapes(etapesData || []);

      // Fetch documents attendus based on procedure model
      const { data: documentsAttenduData, error: documentsError } = await supabase
        .from('documents_attendus_modeles')
        .select(`
          id,
          nom,
          description,
          obligatoire,
          etape_modele_id
        `)
        .in('etape_modele_id', etapesData?.map(e => e.etape_modele_id) || []);

      if (documentsError) throw documentsError;
      setDocumentsAttendus(documentsAttenduData || []);

      // Fetch uploaded documents
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('documents_dossiers')
        .select('*')
        .eq('dossier_id', id);

      if (uploadsError) throw uploadsError;
      setDocumentsUploads(uploadsData || []);

    } catch (error: any) {
      console.error('Error fetching dossier detail:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails du dossier",
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect pour recalculer la progression quand les données changent
  useEffect(() => {
    if (etapes.length > 0 && documentsAttendus.length > 0 && dossier) {
      updateDossierProgression();
    }
  }, [etapes, documentsAttendus, documentsUploads]);

  const calculateProgressionPercentage = () => {
    // Compter les étapes terminées
    const completedEtapes = etapes.filter(e => e.status === 'termine').length;
    const totalEtapes = etapes.length;
    
    // Compter les documents obligatoires uploadés
    const documentsObligatoires = documentsAttendus.filter(doc => doc.obligatoire);
    const documentsObligatoiresUploades = documentsObligatoires.filter(doc => 
      documentsUploads.some(upload => upload.document_attendu_modele_id === doc.id)
    ).length;
    
    // Compter le total d'éléments à compléter (étapes + documents obligatoires)
    const totalElements = totalEtapes + documentsObligatoires.length;
    const elementsCompletes = completedEtapes + documentsObligatoiresUploades;
    
    // Calculer le pourcentage
    if (totalElements === 0) return 0;
    return Math.round((elementsCompletes / totalElements) * 100);
  };

  const updateDossierProgression = async () => {
    const newPercentage = calculateProgressionPercentage();
    
    try {
      const updateData: any = { pourcentage_completion: newPercentage };
      
      // Si le dossier atteint 100%, le marquer comme terminé
      if (newPercentage === 100 && dossier?.status !== 'termine') {
        updateData.status = 'termine';
        updateData.date_fin = new Date().toISOString();
      }

      const { data: updatedDossier, error: dossierError } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id)
        .select();

      if (dossierError) {
        console.error('Error updating dossier completion:', dossierError);
        throw dossierError;
      }

      // Update local dossier state
      setDossier(prev => prev ? { ...prev, ...updateData } : null);
      
      // Afficher un message de succès si le dossier est terminé
      if (newPercentage === 100 && dossier?.status !== 'termine') {
        toast({
          title: "Dossier terminé",
          description: "Le dossier a été marqué comme terminé automatiquement.",
        });
      }
    } catch (error) {
      console.error('Error updating progression:', error);
    }
  };

  const updateEtapeStatus = async (etapeId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'termine') {
        updates.date_fin_reelle = new Date().toISOString();
      } else if (newStatus === 'en_cours') {
        updates.date_debut = new Date().toISOString();
      }

      const { data: updatedEtape, error } = await supabase
        .from('etapes_dossiers')
        .update(updates)
        .eq('id', etapeId)
        .select();

      if (error) {
        console.error('Error updating etape:', error);
        throw error;
      }

      // Update local state
      setEtapes(prev => {
        const newEtapes = prev.map(e => 
          e.id === etapeId 
            ? { ...e, ...updates }
            : e
        );
        return newEtapes;
      });

      // Update progression after state change
      setTimeout(() => updateDossierProgression(), 100);

      toast({
        title: "Étape mise à jour",
        description: `Étape "${etapes.find(e => e.id === etapeId)?.nom}" ${newStatus === 'termine' ? 'terminée' : 'mise à jour'}`,
      });
    } catch (error: any) {
      console.error('Error updating etape:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour l'étape",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'termine':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'en_cours':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'en_attente':
        return <Badge className="bg-gray-100 text-gray-800">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDossierStatusBadge = (status: string) => {
    switch (status) {
      case 'termine':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'en_cours':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'suspendu':
        return <Badge className="bg-yellow-100 text-yellow-800">Suspendu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getDocumentsForEtape = (etapeModeleId: string) => {
    return documentsAttendus.filter(doc => doc.etape_modele_id === etapeModeleId);
  };

  const getUploadedDocument = (documentAttenduId: string) => {
    return documentsUploads.find(doc => doc.document_attendu_modele_id === documentAttenduId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold">Dossier non trouvé</h2>
        <Button onClick={() => navigate('/dossiers')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux dossiers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dossiers')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{dossier.nom}</h1>
            <p className="text-muted-foreground">
              {dossier.client_nom} {dossier.client_prenom}
            </p>
          </div>
        </div>
        {isCollaborateur && (
          <Button
            variant="outline"
            onClick={() => setShowEditDialog(true)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </Button>
        )}
      </div>

      {/* Dossier Info Card */}
      <Card className="notaria-card">
        <CardHeader>
          <CardTitle>Informations du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Créé le {formatDate(dossier.date_creation)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{dossier.procedure_modeles?.nom}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Statut:</span>
              {getDossierStatusBadge(dossier.status)}
            </div>
          </div>
          {dossier.montant_frais && (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(dossier.montant_frais)}
              </span>
            </div>
          )}
          {dossier.description && (
            <p className="text-sm text-muted-foreground">{dossier.description}</p>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progression</span>
              <span className="font-medium">{dossier.pourcentage_completion}%</span>
            </div>
            <Progress value={dossier.pourcentage_completion} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Etapes */}
      <Card className="notaria-card">
        <CardHeader>
          <CardTitle>Étapes du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {etapes.map((etape) => {
            const documentsEtape = getDocumentsForEtape(etape.etape_modele_id);
            return (
              <div key={etape.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isCollaborateur && (
                      <Checkbox
                        checked={etape.status === 'termine'}
                        onCheckedChange={(checked) => {
                          updateEtapeStatus(etape.id, checked ? 'termine' : 'en_attente');
                        }}
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{etape.nom}</h4>
                      {etape.description && (
                        <p className="text-sm text-muted-foreground">{etape.description}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(etape.status)}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span>Début: {formatDate(etape.date_debut)}</span>
                  </div>
                  <div>
                    <span>Fin prévue: {formatDate(etape.date_fin_prevue)}</span>
                  </div>
                  <div>
                    <span>Fin réelle: {formatDate(etape.date_fin_reelle)}</span>
                  </div>
                </div>

                {/* Documents pour cette étape */}
                {documentsEtape.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium">Documents requis:</h5>
                    {documentsEtape.map((docAttendu) => {
                      const uploaded = getUploadedDocument(docAttendu.id);
                      return (
                        <div key={docAttendu.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{docAttendu.nom}</span>
                            {docAttendu.obligatoire && (
                              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {uploaded ? (
                              <>
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Reçu
                                </Badge>
                                <DocumentViewer
                                  documentId={uploaded.id}
                                  fileName={uploaded.fichier_nom || uploaded.nom}
                                  fileUrl={uploaded.fichier_url}
                                  mimeType={uploaded.type_mime}
                                />
                              </>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                En attente
                              </Badge>
                            )}
                            {isCollaborateur && !uploaded && (
                              <DocumentUpload
                                dossierId={id!}
                                etapeDossierId={etape.id}
                                documentAttenduId={docAttendu.id}
                                documentNom={docAttendu.nom}
                                onUploadSuccess={() => {
                                  fetchDossierDetail();
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Section Documents */}
      <Card className="notaria-card">
        <CardHeader>
          <CardTitle>Documents du dossier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentsAttendus.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {documentsAttendus.map((docAttendu) => {
                const uploaded = getUploadedDocument(docAttendu.id);
                const etapeCorrespondante = etapes.find(e => e.etape_modele_id === docAttendu.etape_modele_id);
                
                return (
                  <div key={docAttendu.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <h4 className="font-medium">{docAttendu.nom}</h4>
                          {docAttendu.obligatoire && (
                            <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                          )}
                        </div>
                        {docAttendu.description && (
                          <p className="text-sm text-muted-foreground">{docAttendu.description}</p>
                        )}
                        {etapeCorrespondante && (
                          <p className="text-xs text-muted-foreground">
                            Étape: {etapeCorrespondante.nom}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {uploaded ? (
                          <>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800 mb-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Reçu
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(uploaded.date_upload)}
                              </p>
                            </div>
                            <DocumentViewer
                              documentId={uploaded.id}
                              fileName={uploaded.fichier_nom || uploaded.nom}
                              fileUrl={uploaded.fichier_url}
                              mimeType={uploaded.type_mime}
                              canDelete={true}
                              onDeleteSuccess={fetchDossierDetail}
                            />
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              En attente
                            </Badge>
                            {isCollaborateur && etapeCorrespondante && (
                              <DocumentUpload
                                dossierId={id!}
                                etapeDossierId={etapeCorrespondante.id}
                                documentAttenduId={docAttendu.id}
                                documentNom={docAttendu.nom}
                                onUploadSuccess={fetchDossierDetail}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun document prévu pour ce modèle</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dossier Dialog */}
      <EditDossierDialog
        dossier={dossier}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={fetchDossierDetail}
      />
    </div>
  );
}