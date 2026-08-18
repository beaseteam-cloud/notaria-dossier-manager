import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  role: string;
  email: string;
}

interface Participant {
  id: string;
  user_id: string;
  role_dossier: string;
  note_mission?: string;
  profiles: Profile;
}

interface ParticipantManagerProps {
  dossierId: string;
}

export function ParticipantManager({ dossierId }: ParticipantManagerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [newParticipant, setNewParticipant] = useState({
    user_id: '',
    role_dossier: '',
    note_mission: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParticipants();
    fetchAvailableUsers();
  }, [dossierId]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_participants')
        .select(`
          id,
          user_id,
          role_dossier,
          note_mission,
          created_at
        `)
        .eq('dossier_id', dossierId);

      if (error) throw error;

      // Fetch profile data separately
      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, nom, prenom, role, email')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine data
        const participantsWithProfiles = data.map(participant => {
          const profile = profilesData?.find(p => p.user_id === participant.user_id);
          return {
            ...participant,
            profiles: profile || { id: '', user_id: '', nom: '', prenom: '', role: '', email: '' }
          };
        });

        setParticipants(participantsWithProfiles);
      } else {
        setParticipants([]);
      }
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du chargement des participants",
      });
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, nom, prenom, role, email')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const addParticipant = async () => {
    if (!newParticipant.user_id || !newParticipant.role_dossier) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur et un rôle",
      });
      return;
    }

    // Check if user is already a participant
    if (participants.some(p => p.user_id === newParticipant.user_id)) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Cet utilisateur est déjà participant du dossier",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('dossier_participants')
        .insert({
          dossier_id: dossierId,
          user_id: newParticipant.user_id,
          role_dossier: newParticipant.role_dossier,
          note_mission: newParticipant.note_mission || null
        });

      if (error) throw error;

      setNewParticipant({ user_id: '', role_dossier: '', note_mission: '' });
      fetchParticipants();
      
      toast({
        title: "Succès",
        description: "Participant ajouté avec succès",
      });
    } catch (error: any) {
      console.error('Error adding participant:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de l'ajout du participant",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dossier_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      fetchParticipants();
      
      toast({
        title: "Succès",
        description: "Participant retiré avec succès",
      });
    } catch (error: any) {
      console.error('Error removing participant:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du retrait du participant",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'collaborateur': return 'default';
      case 'clerc': return 'secondary';
      default: return 'outline';
    }
  };

  const updateParticipantRole = async (participantId: string, newRole: string) => {
    setLoading(true);
    try {
      // Un seul manager par dossier : rétrograder l'ancien
      if (newRole === 'manager') {
        const currentManager = participants.find(
          (p) => p.role_dossier === 'manager' && p.id !== participantId
        );
        if (currentManager) {
          const { error: demoteError } = await supabase
            .from('dossier_participants')
            .update({ role_dossier: 'participant' })
            .eq('id', currentManager.id);
          if (demoteError) throw demoteError;
        }
      }

      const { error } = await supabase
        .from('dossier_participants')
        .update({ role_dossier: newRole })
        .eq('id', participantId);

      if (error) throw error;

      await fetchParticipants();
      toast({ title: "Succès", description: "Fonction du participant mise à jour" });
    } catch (error: any) {
      console.error('Error updating participant role:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la fonction",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateParticipantNote = async (participantId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('dossier_participants')
        .update({ note_mission: note || null })
        .eq('id', participantId);

      if (error) throw error;
      await fetchParticipants();
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la note",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User className="h-5 w-5" />
        Participants du dossier
      </h3>

      {/* Liste des participants existants */}
      <div className="space-y-2">
        {participants.map((participant) => (
          <div 
            key={participant.id} 
            className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-muted/20"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {participant.profiles.prenom} {participant.profiles.nom}
                </p>
                <Badge variant={getRoleBadgeVariant(participant.profiles.role)}>
                  {participant.profiles.role}
                </Badge>
                {participant.role_dossier === 'manager' && (
                  <Badge variant="default">Manager du dossier</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {participant.profiles.email}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Fonction dans le dossier</Label>
                  <Select
                    value={participant.role_dossier}
                    onValueChange={(value) => updateParticipantRole(participant.id, value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une fonction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager (en charge)</SelectItem>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                      <SelectItem value="observateur">Observateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Note de mission</Label>
                  <Input
                    defaultValue={participant.note_mission || ''}
                    placeholder="Note optionnelle"
                    onBlur={(e) => {
                      if ((participant.note_mission || '') !== e.target.value) {
                        updateParticipantNote(participant.id, e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeParticipant(participant.id)}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        
        {participants.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            Aucun participant assigné à ce dossier
          </p>
        )}
      </div>

      {/* Formulaire d'ajout */}
      <div className="border-t pt-4 space-y-4">
        <h4 className="font-medium">Ajouter un participant</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="select-user">Utilisateur</Label>
            <Select 
              value={newParticipant.user_id} 
              onValueChange={(value) => setNewParticipant(prev => ({ ...prev, user_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter(user => !participants.some(p => p.user_id === user.user_id))
                  .map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.prenom} {user.nom} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="select-role">Rôle dans le dossier</Label>
            <Select 
              value={newParticipant.role_dossier} 
              onValueChange={(value) => setNewParticipant(prev => ({ ...prev, role_dossier: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="observateur">Observateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="note-mission">Note de mission</Label>
            <Input
              id="note-mission"
              value={newParticipant.note_mission}
              onChange={(e) => setNewParticipant(prev => ({ ...prev, note_mission: e.target.value }))}
              placeholder="Note optionnelle"
            />
          </div>
        </div>

        <Button 
          onClick={addParticipant} 
          disabled={loading || !newParticipant.user_id || !newParticipant.role_dossier}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter le participant
        </Button>
      </div>
    </div>
  );
}