import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, CreditCard, Mail, Phone, ArrowLeft } from "lucide-react";

interface SettingsProps {
  onNavigate?: (page: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
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
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
      </div>
      
      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Contacter le support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Besoin d'aide ? Notre équipe de support est là pour vous aider.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              support@mainteo.com
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              +33 1 23 45 67 89
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Type d'abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Plan Professionnel</h3>
              <p className="text-muted-foreground">
                Accès complet à toutes les fonctionnalités
              </p>
            </div>
            <Badge className="bg-success text-success-foreground">Actif</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Utilisateurs</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">∞</div>
              <div className="text-sm text-muted-foreground">Machines</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
          <Button className="w-full">
            Gérer l'abonnement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};