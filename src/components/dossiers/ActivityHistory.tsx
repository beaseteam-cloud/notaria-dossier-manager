import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ActivityDetails {
  etape_nom?: string;
  document_nom?: string;
  user_nom: string;
  user_prenom: string;
  user_role: string;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  details: ActivityDetails;
}

interface ActivityHistoryProps {
  dossierId: string;
}

export default function ActivityHistory({ dossierId }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [dossierId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('dossier_id', dossierId)
        .in('action', ['etape_completed', 'document_uploaded'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convertir les données avec le bon typage
      const formattedActivities: Activity[] = (data || []).map(item => ({
        id: item.id,
        action: item.action,
        created_at: item.created_at,
        details: (item.details as any) as ActivityDetails
      }));
      
      setActivities(formattedActivities);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger l'historique des activités",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'etape_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'document_uploaded':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.action) {
      case 'etape_completed':
        return `a marqué l'étape "${activity.details.etape_nom}" comme terminée`;
      case 'document_uploaded':
        return `a uploadé le document "${activity.details.document_nom}"`;
      default:
        return 'a effectué une action';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'collaborateur':
        return <Badge variant="default">Collaborateur</Badge>;
      case 'clerc':
        return <Badge variant="secondary">Clerc</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Historique des actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Historique des actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Aucune activité enregistrée
            </p>
            <p className="text-sm text-muted-foreground">
              Les actions des utilisateurs apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.action)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {activity.details.user_prenom} {activity.details.user_nom}
                    </span>
                    {getRoleBadge(activity.details.user_role)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {getActivityDescription(activity)}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(activity.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}