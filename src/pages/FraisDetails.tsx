import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Euro, Calendar, FileText, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FraisDetail {
  id: string;
  dossier_id: string;
  dossier_nom: string;
  client_nom: string;
  etape_nom: string;
  montant_frais: number;
  date_creation: string;
  status: string;
}

export default function FraisDetails() {
  const [fraisDetails, setFraisDetails] = useState<FraisDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFrais, setTotalFrais] = useState(0);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFraisDetails();
  }, []);

  const fetchFraisDetails = async () => {
    try {
      // Récupérer les dossiers avec leurs frais
      const { data: dossiersData, error: dossiersError } = await supabase
        .from('dossiers')
        .select(`
          id,
          nom,
          client_nom,
          status,
          montant_frais,
          created_at
        `)
        .not('montant_frais', 'is', null)
        .gt('montant_frais', 0);

      if (dossiersError) throw dossiersError;

      // Récupérer les étapes qui ont généré les frais
      const dossiersWithEtapes = await Promise.all(
        dossiersData?.map(async (dossier) => {
          let etapeNom = 'Frais du dossier';
          
          // Chercher l'étape de type paiement qui correspond au montant
          const { data: etapesData } = await supabase
            .from('etapes_dossiers')
            .select(`
              nom,
              etapes_modeles!inner(
                nature,
                montant_paiement
              )
            `)
            .eq('dossier_id', dossier.id)
            .eq('etapes_modeles.nature', 'paiement_intermediaire')
            .eq('etapes_modeles.montant_paiement', dossier.montant_frais);
          
          if (etapesData && etapesData.length > 0) {
            etapeNom = etapesData[0].nom;
          }

          return {
            id: `dossier-${dossier.id}`,
            dossier_id: dossier.id,
            dossier_nom: dossier.nom,
            client_nom: dossier.client_nom,
            etape_nom: etapeNom,
            montant_frais: dossier.montant_frais,
            date_creation: dossier.created_at,
            status: dossier.status,
          };
        }) || []
      );

      // Trier par date de création décroissante
      const sortedData = dossiersWithEtapes.sort(
        (a, b) => new Date(b.date_creation).getTime() - new Date(a.date_creation).getTime()
      );

      setFraisDetails(sortedData);
      
      const total = sortedData.reduce((sum, item) => sum + item.montant_frais, 0);
      setTotalFrais(total);

    } catch (error: any) {
      console.error('Error fetching frais details:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails des frais",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Détails des frais
        </h1>
        <p className="text-muted-foreground">
          Vue détaillée de tous les frais générés par les dossiers et étapes
        </p>
      </div>

      {/* Summary Card */}
      <Card className="notaria-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-notaria-gold" />
            Résumé des frais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total des frais générés</p>
              <p className="text-3xl font-bold text-notaria-gold">
                {formatCurrency(totalFrais)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre d'entrées</p>
              <p className="text-2xl font-bold text-primary">
                {fraisDetails.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frais Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Détail par étape</h2>
        
        {fraisDetails.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Euro className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Aucun frais enregistré
              </p>
              <p className="text-sm text-muted-foreground">
                Les frais générés par les étapes apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fraisDetails.map((frais) => (
              <Card 
                key={frais.id} 
                className="notaria-card cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => navigate(`/dossiers/${frais.dossier_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="font-medium text-foreground">
                          {frais.dossier_nom}
                        </h3>
                        {getStatusBadge(frais.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Client: {frais.client_nom}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>Étape: {frais.etape_nom}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(frais.date_creation)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-notaria-gold">
                        {formatCurrency(frais.montant_frais)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}