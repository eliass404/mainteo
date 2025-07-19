import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Lock, Building2 } from "lucide-react";

interface LoginFormProps {
  onLogin: (role: 'admin' | 'technicien', username: string) => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = (role: 'admin' | 'technicien') => {
    if (credentials.username.trim()) {
      onLogin(role, credentials.username);
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
          <p className="text-blue-100">Gestion et maintenance industrielle</p>
        </div>

        <Card className="shadow-industrial">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-semibold text-foreground">Connexion</h2>
            <p className="text-muted-foreground">Accédez à votre espace de travail</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Administrateur
                </TabsTrigger>
                <TabsTrigger value="technicien" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Technicien
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Nom d'utilisateur</Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="admin"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Mot de passe</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSubmit('admin')}
                  disabled={!credentials.username.trim()}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Se connecter en tant qu'administrateur
                </Button>
              </TabsContent>

              <TabsContent value="technicien" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tech-username">Nom d'utilisateur</Label>
                  <Input
                    id="tech-username"
                    type="text"
                    placeholder="technicien"
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech-password">Mot de passe</Label>
                  <Input
                    id="tech-password"
                    type="password"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSubmit('technicien')}
                  disabled={!credentials.username.trim()}
                >
                  <User className="w-4 h-4 mr-2" />
                  Se connecter en tant que technicien
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Version démo - Entrez n'importe quel nom d'utilisateur</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};