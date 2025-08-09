import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash,
  Calendar,
  User,
  Euro
} from 'lucide-react';
import { CreateDossierDialog } from '@/components/dossiers/CreateDossierDialog';
import { EditDossierDialog } from '@/components/dossiers/EditDossierDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Dossier {
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

export default function Dossiers() {
  const { isCollaborateur } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<Dossier | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchDossiers();
  }, []);

  const fetchDossiers = async () => {
    try {
      const { data, error } = await supabase
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
        .order('date_creation', { ascending: false });

      if (error) {
        throw error;
      }

      setDossiers((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching dossiers:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les dossiers",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDossier = async (dossierId: string) => {
    try {
      const { error } = await supabase
        .from('dossiers')
        .delete()
        .eq('id', dossierId);

      if (error) {
        throw error;
      }

      // Refresh the dossiers list
      await fetchDossiers();
      
      toast({
        title: "Dossier supprimé",
        description: "Le dossier a été supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting dossier:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le dossier",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_cours':
        return <Badge className="status-en-cours">En cours</Badge>;
      case 'termine':
        return <Badge className="status-termine">Terminé</Badge>;
      case 'suspendu':
        return <Badge className="status-suspendu">Suspendu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredDossiers = dossiers.filter(dossier => {
    const matchesSearch = 
      dossier.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dossier.client_nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dossier.client_prenom && dossier.client_prenom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground">
            Gérez tous les dossiers clients du cabinet
          </p>
        </div>
        {isCollaborateur && (
          <CreateDossierDialog onDossierCreated={fetchDossiers} />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher par nom de dossier ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="termine">Terminé</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dossiers List */}
      <div className="grid gap-4">
        {filteredDossiers.map((dossier) => (
          <Card key={dossier.id} className="notaria-card hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 
                        className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => window.location.href = `/dossiers/${dossier.id}`}
                      >
                        {dossier.nom}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {dossier.client_nom} {dossier.client_prenom}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(dossier.date_creation)}
                        </span>
                        {dossier.montant_frais && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-3 h-3" />
                            {formatCurrency(dossier.montant_frais)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(dossier.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => window.location.href = `/dossiers/${dossier.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir détails
                          </DropdownMenuItem>
                          {isCollaborateur && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDossier(dossier);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setDossierToDelete(dossier);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {dossier.description && (
                    <p className="text-sm text-muted-foreground">
                      {dossier.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{dossier.pourcentage_completion}%</span>
                    </div>
                    <Progress 
                      value={dossier.pourcentage_completion} 
                      className="h-2"
                    />
                  </div>

                  {dossier.procedure_modeles?.nom && (
                    <div className="pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span>Type: {dossier.procedure_modeles.nom}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDossiers.length === 0 && (
          <Card className="notaria-card">
            <CardContent className="p-12 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Aucun dossier trouvé</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Aucun dossier ne correspond à vos critères de recherche"
                    : "Créez votre premier dossier pour commencer"
                  }
                </p>
                {isCollaborateur && !searchTerm && statusFilter === 'all' && (
                  <Button className="mt-4 notaria-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un dossier
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dossier Dialog */}
      <EditDossierDialog
        dossier={editingDossier}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={fetchDossiers}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le dossier "{dossierToDelete?.nom}" ?
              Cette action est irréversible et supprimera également toutes les étapes et documents associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dossierToDelete) {
                  deleteDossier(dossierToDelete.id);
                  setShowDeleteDialog(false);
                  setDossierToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}