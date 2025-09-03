import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ProfileProps {
  user: {
    role: 'admin' | 'technicien';
    username: string;
    user_id: string;
    email?: string;
  };
  onNavigate?: (page: string) => void;
}

export const Profile = ({ user, onNavigate }: ProfileProps) => {
  const [profile, setProfile] = useState({
    username: user.username,
    email: user.email || "",
    created_at: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, [user.user_id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (error) throw error;

      setProfile({
        username: data.username,
        email: data.email || "",
        created_at: data.created_at
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          email: profile.email
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });

      // Refresh the page to update the header
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = user.role === 'admin' ? 'Administrateur' : 'Technicien';
  const roleColor = user.role === 'admin' ? 'destructive' : 'secondary';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => (onNavigate ? onNavigate('dashboard') : window.history.back())}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Mon Profil</h1>
      </div>
      
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">{user.username}</h2>
              <Badge variant={roleColor} className="mt-1">
                {roleLabel}
              </Badge>
              {profile.created_at && (
                <p className="text-muted-foreground flex items-center gap-1 mt-2">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {new Date(profile.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({...prev, username: e.target.value}))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({...prev, email: e.target.value}))}
                  placeholder="votre.email@exemple.com"
                />
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour le profil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Stats for Technician */}
      {user.role === 'technicien' && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Machines assignées</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Interventions</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Taux de résolution</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};