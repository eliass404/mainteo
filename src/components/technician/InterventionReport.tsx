import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Wrench,
  FileCheck,
  Calendar,
  MapPin,
  Cog,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/hooks/useMachines";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const InterventionReport = () => {
  const { profile } = useAuth();
  const { getUserMachines } = useMachines();
  const { toast } = useToast();
  
  const [userMachines, setUserMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [interventionReport, setInterventionReport] = useState({
    description: "",
    actions: "",
    parts_used: "",
    time_spent: "",
    status: "en-cours"
  });

  // Load user machines and restore state from localStorage
  useEffect(() => {
    if (profile) {
      loadUserMachines();
      
      // Restore selected machine from localStorage
      const savedMachine = localStorage.getItem('techDashboard_selectedMachine');
      if (savedMachine) {
        setSelectedMachine(savedMachine);
      }
    }
  }, [profile]);

  // Save state to localStorage
  useEffect(() => {
    if (selectedMachine) {
      localStorage.setItem('techDashboard_selectedMachine', selectedMachine);
    }
  }, [selectedMachine]);

  const loadUserMachines = async () => {
    try {
      setLoadingMachines(true);
      const machines = await getUserMachines();
      setUserMachines(machines);
      
      if (machines.length === 0) {
        toast({
          title: "Aucune machine assignée",
          description: "Vous n'avez aucune machine assignée. Contactez votre administrateur.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading user machines:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos machines assignées",
        variant: "destructive",
      });
    } finally {
      setLoadingMachines(false);
    }
  };

  const handleSaveReport = async (isFinalized: boolean = false) => {
    if (!selectedMachine) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une machine",
        variant: "destructive",
      });
      return;
    }

    if (isFinalized && !interventionReport.description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir la description du problème pour finaliser",
        variant: "destructive",
      });
      return;
    }

    try {
      const reportStatus = isFinalized ? "termine" : "brouillon";
      
      const { error } = await supabase
        .from('intervention_reports')
        .insert({
          machine_id: selectedMachine,
          technician_id: profile!.user_id,
          description: interventionReport.description,
          actions: interventionReport.actions,
          parts_used: interventionReport.parts_used || null,
          time_spent: interventionReport.time_spent ? parseFloat(interventionReport.time_spent) : null,
          status: reportStatus
        });

      if (error) throw error;

      toast({
        title: isFinalized ? "Intervention finalisée" : "Brouillon sauvegardé",
        description: isFinalized 
          ? "L'intervention a été finalisée avec succès." 
          : "Le brouillon a été sauvegardé avec succès.",
      });

      // Si l'intervention est finalisée, reset le chat de la machine
      if (isFinalized && selectedMachine) {
        try {
          localStorage.removeItem(`aiChat.messages.${selectedMachine}`);
          localStorage.setItem(`aiChat.reset.${selectedMachine}`, 'true');
        } catch (_) {}
      }

      // Reset form
      setInterventionReport({
        description: "",
        actions: "",
        parts_used: "",
        time_spent: "",
        status: "en-cours"
      });

    } catch (error: any) {
      console.error('Error saving intervention report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le rapport",
        variant: "destructive",
      });
    }
  };

  const downloadManual = async () => {
    if (!selectedMachineData?.manual_url) {
      toast({ title: "Manuel non disponible", description: "Aucun manuel PDF n'est disponible pour cette machine", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.storage.from('manuals').download(selectedMachineData.manual_url);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Manuel_${selectedMachineData.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Téléchargement réussi", description: "Le manuel a été téléchargé avec succès" });
    } catch (error) {
      console.error('Error downloading manual:', error);
      toast({ title: "Erreur de téléchargement", description: "Impossible de télécharger le manuel", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-success text-success-foreground">Opérationnel</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">Maintenance</Badge>;
      case 'alert':
        return <Badge variant="destructive">Alerte</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const selectedMachineData = userMachines.find(m => m.id === selectedMachine);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapport d'intervention</h1>
          <p className="text-muted-foreground">Documentez vos interventions et maintenances</p>
        </div>
        <div className="bg-gradient-primary p-3 rounded-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Machine Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Sélectionnez une machine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select 
              value={selectedMachine || ""} 
              onValueChange={setSelectedMachine}
              disabled={loadingMachines}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingMachines ? "Chargement..." : "Choisir une machine"} />
              </SelectTrigger>
              <SelectContent>
                {userMachines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name} - {machine.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedMachineData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Statut:</span>
                  {getStatusBadge(selectedMachineData.status)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Emplacement:</span>
                  <span className="text-sm">{selectedMachineData.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Documentation:</span>
                  <span className="text-sm">{(selectedMachineData.manual_url || selectedMachineData.manual_content) ? 'Disponible' : 'Non disponible'}</span>
                  {selectedMachineData.manual_url && (
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={downloadManual}>
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Report Form */}
      {selectedMachine ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Rapport d'intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description du problème</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez le problème rencontré..."
                    value={interventionReport.description}
                    onChange={(e) => setInterventionReport(prev => ({...prev, description: e.target.value}))}
                    className="min-h-32"
                  />
                </div>

                <div>
                  <Label htmlFor="parts">Pièces utilisées</Label>
                  <Input
                    id="parts"
                    placeholder="Ex: Filtre hydraulique, Joint torique..."
                    value={interventionReport.parts_used}
                    onChange={(e) => setInterventionReport(prev => ({...prev, parts_used: e.target.value}))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="actions">Actions réalisées</Label>
                  <Textarea
                    id="actions"
                    placeholder="Décrivez les actions effectuées..."
                    value={interventionReport.actions}
                    onChange={(e) => setInterventionReport(prev => ({...prev, actions: e.target.value}))}
                    className="min-h-32"
                  />
                </div>

                <div>
                  <Label htmlFor="time">Temps passé (heures)</Label>
                  <Input
                    id="time"
                    type="number"
                    step="0.5"
                    placeholder="2.5"
                    value={interventionReport.time_spent}
                    onChange={(e) => setInterventionReport(prev => ({...prev, time_spent: e.target.value}))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => handleSaveReport(true)}
                className="flex-1"
                disabled={!interventionReport.description.trim()}
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Finaliser l'intervention
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSaveReport(false)}
                disabled={!interventionReport.description.trim()}
              >
                <FileText className="w-4 h-4 mr-2" />
                Sauvegarder le brouillon
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-[400px] flex items-center justify-center">
          <CardContent className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Sélectionnez une machine
            </h3>
            <p className="text-muted-foreground">
              Choisissez une machine ci-dessus pour créer un rapport d'intervention
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};