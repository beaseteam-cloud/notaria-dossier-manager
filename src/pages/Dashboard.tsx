import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FolderOpen, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  Euro
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalDossiers: number;
  dossiersEnCours: number;
  dossiersTermines: number;
  dossiersEnRetard: number;
  etapesEnAttente: number;
  totalFrais: number;
}

interface RecentDossier {
  id: string;
  nom: string;
  client_nom: string;
  status: string;
  pourcentage_completion: number;
  date_creation: string;
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalDossiers: 0,
    dossiersEnCours: 0,
    dossiersTermines: 0,
    dossiersEnRetard: 0,
    etapesEnAttente: 0,
    totalFrais: 0,
  });
  const [recentDossiers, setRecentDossiers] = useState<RecentDossier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Écouter les événements de mise à jour des paiements
    const handlePaymentUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('dossierPaymentUpdated', handlePaymentUpdate);
    
    return () => {
      window.removeEventListener('dossierPaymentUpdated', handlePaymentUpdate);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      
      // Fetch dossiers statistics
      const { data: dossiers, error: dossiersError } = await supabase
        .from('dossiers')
        .select(`
          id,
          nom,
          client_nom,
          status,
          pourcentage_completion,
          date_creation,
          montant_frais
        `)
        .order('date_creation', { ascending: false });

      console.log('Dossiers query result:', { dossiers, dossiersError });

      if (dossiersError) {
        console.error('Error fetching dossiers:', dossiersError);
        // Don't throw here, just continue with empty data
      }

      // Fetch overdue steps to calculate real delays
      const { data: overdueSteps, error: overdueError } = await supabase
        .from('etapes_dossiers')
        .select(`
          dossier_id,
          date_fin_prevue,
          status
        `)
        .not('status', 'eq', 'terminee')
        .lt('date_fin_prevue', new Date().toISOString())
        .not('date_fin_prevue', 'is', null);

      if (overdueError) {
        console.error('Error fetching overdue steps:', overdueError);
      }

      // Get unique dossier IDs with overdue steps
      const dossierIdsWithDelays = new Set(
        overdueSteps?.map(step => step.dossier_id) || []
      );

      // Calculate stats with empty array fallback
      const dossiersData = dossiers || [];
      const totalDossiers = dossiersData.length;
      const dossiersEnCours = dossiersData.filter(d => d.status === 'en_cours').length;
      const dossiersTermines = dossiersData.filter(d => d.status === 'termine').length;
      const dossiersEnRetard = dossiersData.filter(d => 
        dossierIdsWithDelays.has(d.id)
      ).length;
      const totalFrais = dossiersData.reduce((sum, d) => sum + (d.montant_frais || 0), 0);

      console.log('Calculated stats:', { totalDossiers, dossiersEnCours, dossiersTermines });

      // Fetch etapes en attente
      const { data: etapes, error: etapesError } = await supabase
        .from('etapes_dossiers')
        .select('id')
        .eq('status', 'en_attente');

      console.log('Etapes query result:', { etapes, etapesError });

      if (etapesError) {
        console.error('Error fetching etapes:', etapesError);
        // Don't throw here, just continue with empty data
      }

      setStats({
        totalDossiers,
        dossiersEnCours,
        dossiersTermines,
        dossiersEnRetard,
        etapesEnAttente: etapes?.length || 0,
        totalFrais,
      });

      // Set recent dossiers (last 5)
      setRecentDossiers(dossiersData.slice(0, 5));

      console.log('Dashboard data loaded successfully');

    } catch (error: any) {
      console.error('Error in fetchDashboardData:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Impossible de charger les données du tableau de bord: ${error.message}`,
      });
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue {profile?.prenom}, voici un aperçu de l'activité du cabinet.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="notaria-card cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/dossiers')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dossiers</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDossiers}</div>
            <p className="text-xs text-muted-foreground">
              Tous les dossiers actifs
            </p>
          </CardContent>
        </Card>

        <Card 
          className="notaria-card cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/dossiers?status=en_cours')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-notaria-blue-light">{stats.dossiersEnCours}</div>
            <p className="text-xs text-muted-foreground">
              Dossiers en traitement
            </p>
          </CardContent>
        </Card>

        <Card 
          className="notaria-card cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/dossiers?status=termine')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminés</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-notaria-success">{stats.dossiersTermines}</div>
            <p className="text-xs text-muted-foreground">
              Dossiers finalisés
            </p>
          </CardContent>
        </Card>

        <Card 
          className="notaria-card cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/dossiers?status=en_retard')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En retard</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.dossiersEnRetard}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="notaria-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-notaria-gold" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Étapes en attente</span>
              <Badge variant="outline">{stats.etapesEnAttente}</Badge>
            </div>
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
              onClick={() => navigate('/frais')}
            >
              <span className="text-sm text-muted-foreground">Frais totaux</span>
              <span className="font-medium text-notaria-gold hover:text-notaria-gold/80 transition-colors">
                {formatCurrency(stats.totalFrais)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="notaria-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Dossiers récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDossiers.map((dossier) => (
                <div key={dossier.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{dossier.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {dossier.client_nom} • {formatDate(dossier.date_creation)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <Progress value={dossier.pourcentage_completion} className="h-1" />
                    </div>
                    {getStatusBadge(dossier.status)}
                  </div>
                </div>
              ))}
              {recentDossiers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun dossier récent
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="notaria-card">
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              className="notaria-gradient text-white"
              onClick={() => navigate('/dossiers')}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Nouveau dossier
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/modeles')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Créer un modèle
            </Button>
            {isAdmin && (
              <Button 
                variant="outline"
                onClick={() => navigate('/utilisateurs')}
              >
                <Users className="w-4 h-4 mr-2" />
                Voir les utilisateurs
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}