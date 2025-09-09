import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, RefreshCw, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateUsername, validateEmail, validatePassword, sanitizeInput } from "@/lib/validation";

const departments = [
  "Production",
  "Maintenance", 
  "Qualité",
  "Logistique",
  "R&D"
];

interface AddUserModalProps {
  onUserCreated?: () => void;
}

export const AddUserModal = ({ onUserCreated }: AddUserModalProps = {}) => {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    password: ""
  });

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    toast.success("Mot de passe copié dans le presse-papiers");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(formData.username);
    const sanitizedEmail = sanitizeInput(formData.email);
    const sanitizedPhone = sanitizeInput(formData.phone);
    const sanitizedPassword = formData.password.trim();
    
    try {
      if (!sanitizedUsername || !sanitizedEmail || !sanitizedPassword || !formData.role) {
        throw new Error('Veuillez remplir les champs requis');
      }

      // Validate inputs
      const usernameValidation = validateUsername(sanitizedUsername);
      if (!usernameValidation.isValid) {
        throw new Error(usernameValidation.error);
      }

      const emailValidation = validateEmail(sanitizedEmail);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      const passwordValidation = validatePassword(sanitizedPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error);
      }

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: sanitizedEmail,
          password: sanitizedPassword,
          username: sanitizedUsername,
          role: formData.role,
          phone: sanitizedPhone,
          department: formData.department,
        }
      });

      console.log('Create user response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw new Error(error.message);
      }
      
      if (!data?.ok) {
        console.error('User creation failed:', data);
        throw new Error(data?.error || 'Création échouée');
      }

      toast.success(`Utilisateur ${formData.role} créé avec succès`);
      setOpen(false);
      setFormData({ username: '', email: '', phone: '', role: '', department: '', password: '' });
      
      // Actualiser la liste des utilisateurs si une fonction onUserCreated existe
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel Utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                placeholder="Ex: jdupont"
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
                placeholder="jean.dupont@entreprise.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                placeholder="Ex: +33 1 23 45 67 89"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Département</Label>
            <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({...prev, department: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le département" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Mot de passe</Label>
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2 mb-3">
                  <Button type="button" onClick={generatePassword} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Générer
                  </Button>
                  <Button 
                    type="button" 
                    onClick={copyPassword} 
                    variant="outline" 
                    size="sm"
                    disabled={!formData.password}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copier
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                    placeholder="Mot de passe généré automatiquement"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer l'utilisateur
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};