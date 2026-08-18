import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire'),
  description: z.string().optional(),
  client_nom: z.string().min(1, 'Le nom du client est obligatoire'),
  client_prenom: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_telephone: z.string().optional(),
  client_adresse: z.string().optional(),
  procedure_modele_id: z.string().min(1, 'Le modèle de procédure est obligatoire'),
  participants: z.array(z.string()).optional(),
  manager_id: z.string().optional(),
});

interface ProcedureModele {
  id: string;
  nom: string;
  description?: string;
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface CreateDossierDialogProps {
  onDossierCreated: () => void;
}

export function CreateDossierDialog({ onDossierCreated }: CreateDossierDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procedureModeles, setProcedureModeles] = useState<ProcedureModele[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: '',
      description: '',
      client_nom: '',
      client_prenom: '',
      client_email: '',
      client_telephone: '',
      client_adresse: '',
      procedure_modele_id: '',
      participants: [],
      manager_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchProcedureModeles();
      fetchProfiles();
    }
  }, [open]);

  const fetchProcedureModeles = async () => {
    try {
      const { data, error } = await supabase
        .from('procedure_modeles')
        .select('id, nom, description')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setProcedureModeles(data || []);
    } catch (error) {
      console.error('Error fetching procedure modeles:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les modèles de procédure",
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .eq('actif', true)
        .order('nom');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger la liste des utilisateurs",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create the dossier
      const { data: dossier, error: dossierError } = await supabase
        .from('dossiers')
        .insert({
          nom: values.nom,
          description: values.description,
          client_nom: values.client_nom,
          client_prenom: values.client_prenom,
          client_email: values.client_email || null,
          client_telephone: values.client_telephone || null,
          client_adresse: values.client_adresse || null,
          procedure_modele_id: values.procedure_modele_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Add participants if any selected
      if (values.participants && values.participants.length > 0) {
        const participantsData = values.participants.map(userId => ({
          dossier_id: dossier.id,
          user_id: userId,
          role_dossier: 'participant',
        }));

        const { error: participantsError } = await supabase
          .from('dossier_participants')
          .insert(participantsData);

        if (participantsError) throw participantsError;
      }

      toast({
        title: "Succès",
        description: "Le dossier a été créé avec succès",
      });

      form.reset();
      setOpen(false);
      onDossierCreated();
    } catch (error: any) {
      console.error('Error creating dossier:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer le dossier",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="notaria-gradient text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau dossier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau dossier client
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du dossier *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du dossier..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="procedure_modele_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle de procédure *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un modèle..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {procedureModeles.map((modele) => (
                          <SelectItem key={modele.id} value={modele.id}>
                            {modele.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description du dossier..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Informations client</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du client *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_prenom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom du client</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email du client</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemple.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone du client</FormLabel>
                      <FormControl>
                        <Input placeholder="Téléphone..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="client_adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse du client</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Adresse complète..."
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="participants"
              render={() => (
                <FormItem>
                  <FormLabel>Participants au dossier</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                    {profiles.map((profile) => (
                      <FormField
                        key={profile.id}
                        control={form.control}
                        name="participants"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={profile.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(profile.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), profile.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== profile.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {profile.prenom} {profile.nom}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="notaria-gradient text-white"
              >
                {loading ? 'Création...' : 'Créer le dossier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}