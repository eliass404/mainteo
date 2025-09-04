import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Shield, User, Mail, Lock, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateUsername, validateEmail, validatePassword, sanitizeInput } from "@/lib/validation";

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'technicien'>('technicien');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password.trim();
    
    if (!sanitizedEmail || !sanitizedPassword) return;

    setIsLoading(true);
    try {
      let signinEmail = sanitizedEmail;
      // Si l'utilisateur saisit un nom d'utilisateur, on récupère l'email associé
      if (!signinEmail.includes('@')) {
        // Validate username format
        const usernameValidation = validateUsername(signinEmail);
        if (!usernameValidation.isValid) {
          throw new Error(usernameValidation.error);
        }
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', signinEmail)
          .maybeSingle();
        if (error) throw error;
        if (!profile?.email) {
          throw new Error("Nom d'utilisateur introuvable ou email manquant");
        }
        signinEmail = profile.email;
      } else {
        // Validate email format
        const emailValidation = validateEmail(signinEmail);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.error);
        }
      }

      const { error } = await signIn(signinEmail, sanitizedPassword);
      if (error) {
        throw error;
      }
    } catch (err: any) {
      toast({
        title: "Erreur de connexion",
        description: err.message || 'Veuillez vérifier vos identifiants.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize and validate inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = password.trim();
    
    if (!sanitizedEmail || !sanitizedPassword || !sanitizedUsername) return;

    // Validate inputs
    const emailValidation = validateEmail(sanitizedEmail);
    if (!emailValidation.isValid) {
      toast({
        title: "Erreur de validation",
        description: emailValidation.error,
        variant: "destructive",
      });
      return;
    }

    const usernameValidation = validateUsername(sanitizedUsername);
    if (!usernameValidation.isValid) {
      toast({
        title: "Erreur de validation",
        description: usernameValidation.error,
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      toast({
        title: "Erreur de validation",
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Vérifier l'unicité du nom d'utilisateur côté client
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', sanitizedUsername)
        .maybeSingle();
      if (existing) {
        throw new Error("Ce nom d'utilisateur est déjà pris");
      }

      const { error } = await signUp(sanitizedEmail, sanitizedPassword, sanitizedUsername, role);
      if (error) throw error;

      toast({
        title: "Compte créé",
        description: "Vérifiez votre email pour confirmer votre compte. (Astuce: désactivez la confirmation email en phase de test dans Supabase)",
      });
    } catch (err: any) {
      toast({
        title: "Erreur d'inscription",
        description: err.message || "Impossible de créer le compte",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-xl shadow-industrial mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">IndustrialCare</h1>
          <p className="text-blue-100">Gestion et maintenance industrielle avec IA</p>
        </div>

        <Card className="shadow-industrial">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Système de Maintenance</CardTitle>
            <CardDescription>
              Connectez-vous ou créez un compte pour accéder au système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-identifier">Email ou nom d'utilisateur</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="signin-identifier"
                          type="text"
                          placeholder="email ou nom d'utilisateur"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Votre nom"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Select value={role} onValueChange={(value: 'admin' | 'technicien') => setRole(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technicien">
                          <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Technicien
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Administrateur
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Création..." : "Créer un compte"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};