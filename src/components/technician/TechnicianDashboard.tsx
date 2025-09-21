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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Professional Header */}
      <div className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Dashboard Technicien
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Connecté • {profile?.username}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </p>
              <p className="text-lg font-semibold">
                {new Date().toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Notifications Section */}
        <MaintenanceNotifications />

        {/* Main Content */}
        <div className="glass-card border-0 shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-6 pb-0">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="machines" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Wrench className="w-4 h-4 mr-2" />
                  Machines
                </TabsTrigger>
                <TabsTrigger value="chat" disabled={!selectedMachine} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Assistant IA
                </TabsTrigger>
                <TabsTrigger value="rapport" disabled={!selectedMachine} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Rapport d'intervention
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="machines" className="space-y-6 mt-0">
                <MachineSelector 
                  selectedMachine={selectedMachine}
                  onMachineSelect={handleMachineSelect}
                />
              </TabsContent>

              <TabsContent value="chat" className="space-y-6 mt-0">
                {selectedMachine ? (
                  <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">Assistant IA</h3>
                            {selectedMachineName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Machine: {selectedMachineName}
                              </p>
                            )}
                          </div>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadMachineManual}
                          className="hover-glow"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Manuel PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="h-96 overflow-y-auto border rounded-xl p-4 space-y-4 bg-background/50">
                          {chatMessages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex items-start gap-3 animate-fade-in ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {message.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                  <Bot className="w-4 h-4 text-primary" />
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                                  message.role === 'user'
                                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                                    : 'bg-muted/80 backdrop-blur-sm border'
                                }`}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              </div>
                              {message.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                                  <User className="w-4 h-4 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-3 animate-fade-in">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-primary animate-pulse" />
                              </div>
                              <div className="bg-muted/80 backdrop-blur-sm border p-4 rounded-2xl">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                  <span className="ml-2 text-sm">L'IA réfléchit...</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Input
                            placeholder="Tapez votre question..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isLoading}
                            className="flex-1 rounded-xl border-muted-foreground/20 focus:border-primary"
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={isLoading || !inputMessage.trim()}
                            className="rounded-xl px-6 hover-glow"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-2 border-muted-foreground/20">
                    <CardContent className="pt-12 pb-12 text-center">
                      <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">Assistant IA en attente</h3>
                      <p className="text-muted-foreground">
                        Sélectionnez une machine pour commencer une conversation avec l'assistant IA
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rapport" className="space-y-6 mt-0">
                {selectedMachine ? (
                  <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-orange-500/5 to-orange-500/10 border-b">
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">Rapport d'intervention</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Documentez votre intervention sur la machine
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <div className="grid gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="description" className="text-sm font-medium">
                              Description du problème
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Décrivez le problème rencontré..."
                              value={interventionReport.description}
                              onChange={(e) => setInterventionReport(prev => ({
                                ...prev,
                                description: e.target.value
                              }))}
                              className="min-h-[100px] rounded-xl border-muted-foreground/20 focus:border-primary"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="actions" className="text-sm font-medium">
                              Actions effectuées
                            </Label>
                            <Textarea
                              id="actions"
                              placeholder="Décrivez les actions que vous avez effectuées..."
                              value={interventionReport.actions}
                              onChange={(e) => setInterventionReport(prev => ({
                                ...prev,
                                actions: e.target.value
                              }))}
                              className="min-h-[100px] rounded-xl border-muted-foreground/20 focus:border-primary"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label htmlFor="parts_used" className="text-sm font-medium">
                                Pièces utilisées
                              </Label>
                              <Input
                                id="parts_used"
                                placeholder="Liste des pièces..."
                                value={interventionReport.parts_used}
                                onChange={(e) => setInterventionReport(prev => ({
                                  ...prev,
                                  parts_used: e.target.value
                                }))}
                                className="rounded-xl border-muted-foreground/20 focus:border-primary"
                              />
                            </div>
                            
                            <div className="space-y-3">
                              <Label htmlFor="time_spent" className="text-sm font-medium">
                                Temps passé (heures)
                              </Label>
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
                                className="rounded-xl border-muted-foreground/20 focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-6 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => handleSaveReport(false)}
                            className="rounded-xl hover-glow"
                          >
                            Sauvegarder brouillon
                          </Button>
                          <Button 
                            onClick={() => handleSaveReport(true)}
                            className="rounded-xl hover-glow bg-gradient-to-r from-primary to-primary/90"
                          >
                            Finaliser rapport
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-2 border-muted-foreground/20">
                    <CardContent className="pt-12 pb-12 text-center">
                      <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-semibold mb-2">Rapport d'intervention</h3>
                      <p className="text-muted-foreground">
                        Sélectionnez une machine pour créer un rapport d'intervention
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};