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
import { useState } from "react";
import { CreateTicketModal } from "../tickets/CreateTicketModal";
import { TicketList } from "../tickets/TicketList";

const mockMachines = [
  {
    id: "M001",
    name: "Presse hydraulique A",
    type: "Presse",
    location: "Atelier 1",
    status: "operational",
    description: "Presse hydraulique 500T pour emboutissage",
    lastMaintenance: "2024-01-15",
    nextMaintenance: "2024-02-15",
    hasManual: true,
    hasNotice: true
  },
  {
    id: "M002",
    name: "Compresseur B",
    type: "Compresseur",
    location: "Atelier 2",
    status: "maintenance",
    description: "Compresseur d'air 50L",
    lastMaintenance: "2024-01-10",
    nextMaintenance: "2024-02-10",
    hasManual: true,
    hasNotice: false
  },
  {
    id: "M003",
    name: "Convoyeur C",
    type: "Convoyeur",
    location: "Ligne 1",
    status: "alert",
    description: "Convoyeur à bande 50m de long",
    lastMaintenance: "2024-01-05",
    nextMaintenance: "2024-01-20",
    hasManual: false,
    hasNotice: true
  }
];

export const TechnicianDashboard = () => {
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiReady, setIsAiReady] = useState(false);
  const [interventionReport, setInterventionReport] = useState({
    description: "",
    actions: "",
    partsUsed: "",
    timeSpent: "",
    status: "en-cours"
  });

  const handleMachineSelect = async (machineId: string) => {
    setSelectedMachine(machineId);
    setIsAiReady(false);
    setChatMessages([]);
    
    const machine = mockMachines.find(m => m.id === machineId);
    if (machine) {
      // Simuler le chargement des documents par l'IA
      setChatMessages([{
        role: 'assistant',
        content: `🔄 Analyse en cours des documents de la machine ${machine.name}...`
      }]);
      
      // Simuler le temps de traitement
      setTimeout(() => {
        setIsAiReady(true);
        const docs = [];
        if (machine.hasManual) docs.push('le manuel d\'utilisation');
        if (machine.hasNotice) docs.push('la notice technique');
        
        setChatMessages([{
          role: 'assistant',
          content: `✅ J'ai analysé ${docs.join(' et ')} de la machine ${machine.name}. Je suis maintenant prêt à répondre à vos questions sur cette machine. Comment puis-je vous aider ?`
        }]);
      }, 2000);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !isAiReady) return;

    const userMessage = { role: 'user' as const, content: inputMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Simuler une réponse de l'IA
    setTimeout(() => {
      const assistantMessage = {
        role: 'assistant' as const,
        content: `D'après l'analyse des documents techniques de cette machine, voici ma réponse : ${inputMessage}. Les procédures recommandées sont détaillées dans le manuel d'utilisation.`
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1000);
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

  const selectedMachineData = mockMachines.find(m => m.id === selectedMachine);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Espace Technicien</h2>
            <p className="text-blue-100">Sélectionnez une machine pour commencer l'assistance IA</p>
          </div>
          <CreateTicketModal />
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
            <div className="space-y-2">
              <Label>Sélectionner une machine</Label>
              <Select value={selectedMachine || ""} onValueChange={handleMachineSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une machine" />
                </SelectTrigger>
                <SelectContent>
                  {mockMachines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      <div className="flex items-center gap-2">
                        <span>{machine.id} - {machine.name}</span>
                        <div className="flex gap-1">
                          {machine.hasManual && (
                            <span className="text-xs bg-primary/10 text-primary px-1 rounded">Manuel</span>
                          )}
                          {machine.hasNotice && (
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
                    Prochaine: {selectedMachineData.nextMaintenance}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3 h-3" />
                    {selectedMachineData.hasManual && selectedMachineData.hasNotice 
                      ? "Manuel + Notice disponibles"
                      : selectedMachineData.hasManual 
                        ? "Manuel disponible" 
                        : "Notice disponible"}
                  </div>
                </div>
              </div>
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
                </CardTitle>
                <p className="text-muted-foreground">{selectedMachineData?.description}</p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="chat" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Assistant IA
                    </TabsTrigger>
                    <TabsTrigger value="rapport" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Rapport d'intervention
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat" className="space-y-4">
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
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder={isAiReady ? "Décrivez le problème ou posez une question..." : "Veuillez attendre que l'IA analyse les documents..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={!isAiReady}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!isAiReady || !inputMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="rapport" className="space-y-4">
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
                          value={interventionReport.partsUsed}
                          onChange={(e) => setInterventionReport({...interventionReport, partsUsed: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Temps passé (heures)</Label>
                        <Input
                          id="time"
                          type="number"
                          placeholder="2.5"
                          value={interventionReport.timeSpent}
                          onChange={(e) => setInterventionReport({...interventionReport, timeSpent: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finaliser l'intervention
                      </Button>
                      <Button variant="outline" className="flex-1">
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
                  <Cog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une machine pour commencer</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tickets Section */}
      <TicketList viewType="technician" technicianName="Jean Dupont" />
    </div>
  );
};