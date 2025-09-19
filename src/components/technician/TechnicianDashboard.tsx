import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Wrench,
  FileCheck,
  Download
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/hooks/useMachines";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceNotifications } from "./MaintenanceNotifications";
import { MachineSelector } from "./MachineSelector";

export const TechnicianDashboard = () => {
  const { profile } = useAuth();
  const { getUserMachines } = useMachines();
  const { chatMessages, isLoading, sendMessage, initializeChat } = useAIChat();
  const { toast } = useToast();
  
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [interventionReport, setInterventionReport] = useState({
    description: "",
    actions: "",
    parts_used: "",
    time_spent: "",
    status: "en-cours"
  });
  const [activeTab, setActiveTab] = useState('machines');

  // Restore persisted UI state
  useEffect(() => {
    try {
      const savedMachine = localStorage.getItem('selectedMachineId');
      if (savedMachine) setSelectedMachine(savedMachine);
      const savedTab = localStorage.getItem('technician.activeTab');
      if (savedTab) setActiveTab(savedTab);
    } catch (_) {}
  }, []);

  // Persist UI state
  useEffect(() => {
    try {
      localStorage.setItem('technician.activeTab', activeTab);
    } catch (_) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      if (selectedMachine) localStorage.setItem('selectedMachineId', selectedMachine);
    } catch (_) {}
  }, [selectedMachine]);

  const handleMachineSelect = async (machineId: string) => {
    setSelectedMachine(machineId);
    setActiveTab('chat');
    
    // Initialize chat for the selected machine
    try {
      const machines = await getUserMachines();
      const machine = machines.find(m => m.id === machineId);
      if (machine) {
        await initializeChat(machineId, machine.name);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedMachine || isLoading) return;
    
    await sendMessage(inputMessage, selectedMachine);
    setInputMessage("");
  };

  const handleSaveReport = async (isFinalized: boolean = false) => {
    if (!selectedMachine || !profile) return;

    try {
      const reportStatus = isFinalized ? "termine" : "brouillon";
      
      const { error } = await supabase
        .from('intervention_reports')
        .insert({
          machine_id: selectedMachine,
          technician_id: profile.user_id,
          description: interventionReport.description,
          actions: interventionReport.actions,
          parts_used: interventionReport.parts_used,
          time_spent: parseFloat(interventionReport.time_spent) || null,
          status: reportStatus
        });

      if (error) throw error;

      toast({
        title: isFinalized ? "Rapport finalisé" : "Brouillon sauvegardé",
        description: isFinalized ? 
          "Le rapport d'intervention a été finalisé avec succès." : 
          "Le brouillon a été sauvegardé.",
      });

      // Reset form if finalized
      if (isFinalized) {
        setInterventionReport({
          description: "",
          actions: "",
          parts_used: "",
          time_spent: "",
          status: "en-cours"
        });
      }
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le rapport",
        variant: "destructive",
      });
    }
  };

  const downloadMachineManual = async () => {
    if (!selectedMachine) return;

    try {
      const machines = await getUserMachines();
      const machine = machines.find(m => m.id === selectedMachine);
      
      if (!machine?.manual_url) {
        toast({
          title: "Aucun manuel",
          description: "Cette machine n'a pas de manuel PDF disponible",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('manuals')
        .download(machine.manual_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Manuel_${machine.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: "Le manuel a été téléchargé avec succès"
      });
    } catch (error: any) {
      console.error('Error downloading manual:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le manuel",
        variant: "destructive",
      });
    }
  };

  const [selectedMachineName, setSelectedMachineName] = useState<string | null>(null);

  useEffect(() => {
    const updateMachineName = async () => {
      if (!selectedMachine) {
        setSelectedMachineName(null);
        return;
      }
      try {
        const machines = await getUserMachines();
        const machine = machines.find(m => m.id === selectedMachine);
        setSelectedMachineName(machine?.name || null);
      } catch {
        setSelectedMachineName(null);
      }
    };
    updateMachineName();
  }, [selectedMachine, getUserMachines]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Technicien</h1>
          <p className="text-muted-foreground">
            Bienvenue, {profile?.username}
          </p>
        </div>
      </div>

      <MaintenanceNotifications />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">
            <Wrench className="w-4 h-4 mr-2" />
            Machines
          </TabsTrigger>
          <TabsTrigger value="chat" disabled={!selectedMachine}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Assistant IA
          </TabsTrigger>
          <TabsTrigger value="rapport" disabled={!selectedMachine}>
            <FileCheck className="w-4 h-4 mr-2" />
            Rapport d'intervention
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="space-y-4">
          <MachineSelector 
            selectedMachine={selectedMachine}
            onMachineSelect={handleMachineSelect}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          {selectedMachine ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Assistant IA{selectedMachineName ? ` - Machine ${selectedMachineName}` : ''}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadMachineManual}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Manuel PDF
                  </Button>
                </div>
                <CardDescription>
                  Posez vos questions sur la machine sélectionnée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">L'IA est en train de réfléchir...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tapez votre question..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Sélectionnez une machine pour commencer le chat
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rapport" className="space-y-4">
          {selectedMachine ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Rapport d'intervention
                </CardTitle>
                <CardDescription>
                  Documentez votre intervention sur la machine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description du problème</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez le problème rencontré..."
                      value={interventionReport.description}
                      onChange={(e) => setInterventionReport(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="actions">Actions effectuées</Label>
                    <Textarea
                      id="actions"
                      placeholder="Décrivez les actions que vous avez effectuées..."
                      value={interventionReport.actions}
                      onChange={(e) => setInterventionReport(prev => ({
                        ...prev,
                        actions: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parts_used">Pièces utilisées</Label>
                      <Input
                        id="parts_used"
                        placeholder="Liste des pièces..."
                        value={interventionReport.parts_used}
                        onChange={(e) => setInterventionReport(prev => ({
                          ...prev,
                          parts_used: e.target.value
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time_spent">Temps passé (heures)</Label>
                      <Input
                        id="time_spent"
                        type="number"
                        step="0.5"
                        placeholder="2.5"
                        value={interventionReport.time_spent}
                        onChange={(e) => setInterventionReport(prev => ({
                          ...prev,
                          time_spent: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSaveReport(false)}
                  >
                    Sauvegarder brouillon
                  </Button>
                  <Button onClick={() => handleSaveReport(true)}>
                    Finaliser rapport
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Sélectionnez une machine pour créer un rapport
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};