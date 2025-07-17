import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  user_id: string;
  email: string;
  nom: string;
  prenom: string;
}

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function ChangePasswordDialog({ open, onOpenChange, user }: ChangePasswordDialogProps) {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: passwordError } = await supabase.functions.invoke('change-user-password', {
        body: {
          userId: user.user_id,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
        },
      });

      if (passwordError) {
        setError(passwordError.message || 'Erreur lors de la modification du mot de passe');
        return;
      }

      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès",
      });

      setFormData({ oldPassword: "", newPassword: "" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur lors de la modification du mot de passe:", error);
      setError(error.message || "Impossible de modifier le mot de passe");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({ oldPassword: "", newPassword: "" });
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-info">Utilisateur</Label>
            <div className="text-sm text-muted-foreground">
              {user.prenom} {user.nom} - {user.email}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Ancien mot de passe</Label>
            <Input
              id="oldPassword"
              type="password"
              value={formData.oldPassword}
              onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Modification..." : "Valider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}