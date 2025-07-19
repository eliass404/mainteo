import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wrench
} from "lucide-react";
import { useState } from "react";

const mockMachines = [
  {
    id: "M001",
    name: "Presse hydraulique A",
    type: "Presse",
    location: "Atelier 1",
    status: "operational",
    description: "Presse hydraulique 500T pour emboutissage",
    lastMaintenance: "2024-01-15",
    nextMaintenance: "2024-02-15"
  },
  {
    id: "M003",
    name: "Convoyeur C",
    type: "Convoyeur",
    location: "Ligne 1",
    status: "alert",
    description: "Convoyeur à bande 50m de long",
    lastMaintenance: "2024-01-05",
    nextMaintenance: "2024-01-20"
  }
];

const mockChatHistory = [
  {
    type: "user",
    message: "La presse hydraulique fait un bruit anormal lors du cycle de montée",
    timestamp: "10:30"
  },
  {
    type: "bot",
    message: "D'après les spécifications techniques de votre presse hydraulique 500T, un bruit anormal pendant la montée peut indiquer plusieurs problèmes possibles :\n\n1. **Niveau d'huile hydraulique** : Vérifiez le niveau dans le réservoir\n2. **Filtre hydraulique** : Peut être encrassé\n3. **Pompe hydraulique** : Usure possible des composants\n\nQue vous recommandez-vous de vérifier en premier le niveau d'huile hydraulique ?",
    timestamp: "10:31"
  }
];

interface TechnicianDashboardProps {
  username: string;
}

export const TechnicianDashboard = ({ username }: TechnicianDashboardProps) => {
  const [selectedMachine, setSelectedMachine] = useState(mockMachines[0]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState(mockChatHistory);
  const [interventionReport, setInterventionReport] = useState({
    description: "",
    actions: "",
    partsUsed: "",
    timeSpent: "",
    status: "en-cours"
  });

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    
    const newMessage = {
      type: "user" as const,
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory([...chatHistory, newMessage]);
    setChatMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      const botResponse = {
        type: "bot" as const,
        message: "Je vous aide à diagnostiquer ce problème. D'après les données techniques de cette machine, voici mes recommandations...",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, botResponse]);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-success text-success-foreground">Opérationnel</Badge>;
      case 'alert':
        return <Badge variant="destructive">Alerte</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Bonjour {username} !</h2>
        <p className="text-blue-100">Vous avez {mockMachines.length} machines assignées aujourd'hui</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Machines */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="w-5 h-5" />
              Mes Machines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockMachines.map((machine) => (
              <div 
                key={machine.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedMachine.id === machine.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedMachine(machine)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{machine.name}</h3>
                  {getStatusBadge(machine.status)}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {machine.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Prochaine: {machine.nextMaintenance}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                {selectedMachine.name}
              </CardTitle>
              <p className="text-muted-foreground">{selectedMachine.description}</p>
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
                    {chatHistory.map((msg, index) => (
                      <div key={index} className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                            <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                            {msg.type === 'user' ? (
                              <UserIcon className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className={`p-3 rounded-lg whitespace-pre-wrap ${
                            msg.type === 'user' 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-white border'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Décrivez le problème ou posez une question..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!chatMessage.trim()}>
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
        </div>
      </div>
    </div>
  );
};