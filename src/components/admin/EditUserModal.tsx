import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateUsername, validateEmail, validateRoleUpdate, validateRole, sanitizeInput } from "@/lib/validation";

interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: string;
}

interface EditUserModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  currentUserRole: string;
  currentUserId: string;
}

export const EditUserModal = ({ user, open, onOpenChange, onUserUpdated, currentUserRole, currentUserId }: EditUserModalProps) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: ""
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email || "",
        role: user.role
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(formData.username);
    const sanitizedEmail = sanitizeInput(formData.email);

    // Validate inputs
    const usernameValidation = validateUsername(sanitizedUsername);
    if (!usernameValidation.isValid) {
      toast({
        title: "Erreur de validation",
        description: usernameValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (sanitizedEmail) {
      const emailValidation = validateEmail(sanitizedEmail);
      if (!emailValidation.isValid) {
        toast({
          title: "Erreur de validation",
          description: emailValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate role
    const roleValidation = validateRole(formData.role);
    if (!roleValidation.isValid) {
      toast({
        title: "Erreur de validation",
        description: roleValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if role is being changed and if user has permission
    if (formData.role !== user.role) {
      const isTargetSelf = user.user_id === currentUserId;
      const roleUpdateValidation = validateRoleUpdate(currentUserRole, isTargetSelf);
      if (!roleUpdateValidation.isValid) {
        toast({
          title: "Erreur d'autorisation",
          description: roleUpdateValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: sanitizedUsername,
          email: sanitizedEmail || null,
          role: formData.role,
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Utilisateur modifié",
        description: "Les informations de l'utilisateur ont été mises à jour avec succès.",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="technicien">Technicien</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Modification..." : "Modifier l'utilisateur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};