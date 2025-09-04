import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Cog, 
  MessageCircle, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Send,
  Bot,
  User as UserIcon,
  Calendar,
  MapPin,
  Wrench,
  FileCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/hooks/useMachines";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const TechnicianDashboard = () => {
  const { profile } = useAuth();
  const { getUserMachines } = useMachines();
  const { chatMessages, isLoading, sendMessage, initializeChat } = useAIChat();
  const { toast } = useToast();
  
  const [userMachines, setUserMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [interventionReport, setInterventionReport] = useState({
    description: "",
    actions: "",
    parts_used: "",
    time_spent: "",
    status: "en-cours"
  });
  const [activeTab, setActiveTab] = useState('chat');
  useEffect(() => {
    if (profile) {
      loadUserMachines();
    }
  }, [profile]);

  const loadUserMachines = async () => {
    if (!profile) return;
    
    setLoadingMachines(true);
    try {
      const machines = await getUserMachines(profile.user_id);
      setUserMachines(machines);
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

  const handleMachineSelect = async (machineId: string) => {
    setSelectedMachine(machineId);
    const machine = userMachines.find(m => m.id === machineId);
    if (machine) {
      await initializeChat(machineId, machine.name);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedMachine || isLoading) return;
    
    await sendMessage(inputMessage, selectedMachine);
    setInputMessage("");
  };

  const handleSaveReport = async () => {
    if (!selectedMachine || !profile) return;

    try {
      const { error } = await supabase
        .from('intervention_reports')
        .insert({
          machine_id: selectedMachine,
          technician_id: profile.user_id,
          description: interventionReport.description,
          actions: interventionReport.actions,
          parts_used: interventionReport.parts_used,
          time_spent: parseFloat(interventionReport.time_spent) || null,
          status: interventionReport.status
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Succès",
        description: "Rapport d'intervention sauvegardé",
      });

      // Reset form
      setInterventionReport({
        description: "",
        actions: "",
        parts_used: "",
        time_spent: "",
        status: "en-cours"
      });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le rapport",
        variant: "destructive",
      });
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
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Espace Technicien</h2>
            <p className="text-blue-100">
              Bonjour {profile?.username}! Sélectionnez une machine pour commencer l'assistance IA
            </p>
          </div>
          <Bot className="w-12 h-12 text-white/80" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="w-5 h-5" />
              Mes Machines Assignées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingMachines ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            ) : userMachines.length === 0 ? (
              <div className="text-center py-4">
                <Cog className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune machine assignée</p>
                <p className="text-xs text-muted-foreground">Contactez votre administrateur</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Sélectionner une machine</Label>
                  <Select value={selectedMachine || ""} onValueChange={handleMachineSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {userMachines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          <div className="flex items-center gap-2">
                            <span>{machine.id} - {machine.name}</span>
                            <div className="flex gap-1">
                              {machine.manual_url && (
                                <span className="text-xs bg-primary/10 text-primary px-1 rounded">Manuel</span>
                              )}
                              {machine.notice_url && (
                                <span className="text-xs bg-accent/10 text-accent-foreground px-1 rounded">Notice</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMachineData && (
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm">{selectedMachineData.name}</h3>
                      {getStatusBadge(selectedMachineData.status)}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {selectedMachineData.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Prochaine: {selectedMachineData.next_maintenance || 'Non programmée'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-3 h-3" />
                        {selectedMachineData.manual_url && selectedMachineData.notice_url 
                          ? "Manuel + Notice disponibles"
                          : selectedMachineData.manual_url 
                            ? "Manuel disponible" 
                            : selectedMachineData.notice_url
                              ? "Notice disponible"
                              : "Aucun document"}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {selectedMachine ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  {selectedMachineData?.name}
                  <Badge variant="outline" className="ml-auto">MAIA Ready</Badge>
                </CardTitle>
                <p className="text-muted-foreground">{selectedMachineData?.description}</p>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Assistant IA MAIA
                    </TabsTrigger>
                    <TabsTrigger value="rapport" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Rapport d'intervention
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat" forceMount className="space-y-4">
                    <div className="border rounded-lg h-96 overflow-y-auto p-4 space-y-4 bg-muted/20">
                      {chatMessages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {msg.role === 'user' ? (
                                <UserIcon className="w-4 h-4" />
                              ) : (
                                <Bot className="w-4 h-4 text-primary" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {msg.role === 'user' ? 'Vous' : 'MAIA'}
                              </span>
                            </div>
                            <div className={`p-3 rounded-lg whitespace-pre-wrap ${
                              msg.role === 'user' 
                                ? 'bg-primary text-primary-foreground ml-auto' 
                                : 'bg-white border'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">MAIA</span>
                          </div>
                          <div className="bg-white border p-3 rounded-lg">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Décrivez le problème ou posez une question à MAIA..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={isLoading || !inputMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="rapport" forceMount className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Description du problème</Label>
                        <Textarea
                          id="description"
                          placeholder="Décrivez le problème rencontré..."
                          value={interventionReport.description}
                          onChange={(e) => setInterventionReport({...interventionReport, description: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actions">Actions réalisées</Label>
                        <Textarea
                          id="actions"
                          placeholder="Décrivez les actions effectuées..."
                          value={interventionReport.actions}
                          onChange={(e) => setInterventionReport({...interventionReport, actions: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parts">Pièces utilisées</Label>
                        <Input
                          id="parts"
                          placeholder="Ex: Filtre hydraulique, Joint torique..."
                          value={interventionReport.parts_used}
                          onChange={(e) => setInterventionReport({...interventionReport, parts_used: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Temps passé (heures)</Label>
                        <Input
                          id="time"
                          type="number"
                          step="0.1"
                          placeholder="2.5"
                          value={interventionReport.time_spent}
                          onChange={(e) => setInterventionReport({...interventionReport, time_spent: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button 
                        className="flex-1"
                        onClick={() => setInterventionReport({...interventionReport, status: 'termine'})}
                        disabled={!interventionReport.description.trim()}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finaliser l'intervention
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleSaveReport}
                        disabled={!interventionReport.description.trim()}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Sauvegarder le brouillon
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">MAIA Assistant IA</h3>
                  <p>Sélectionnez une machine pour commencer l'assistance IA</p>
                  <p className="text-sm mt-2">MAIA analysera automatiquement les documents techniques disponibles</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};