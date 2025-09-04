import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Cog, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle, 
  Send,
  Bot,
  User as UserIcon,
  Calendar,
  MapPin,
  FileCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/hooks/useMachines";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/components/ui/use-toast";

export const AIAssistant = () => {
  const { profile } = useAuth();
  const { getUserMachines } = useMachines();
  const { chatMessages, isLoading, sendMessage, initializeChat } = useAIChat();
  const { toast } = useToast();
  
  const [userMachines, setUserMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingMachines, setLoadingMachines] = useState(true);

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

  // Initialize chat when machine is selected and data is available
  useEffect(() => {
    if (selectedMachine && userMachines.length > 0) {
      const machine = userMachines.find(m => m.id === selectedMachine);
      if (machine) {
        initializeChat(selectedMachine, machine.name);
      }
    }
  }, [selectedMachine, userMachines, initializeChat]);

  const loadUserMachines = async () => {
    try {
      setLoadingMachines(true);
      const machines = await getUserMachines(profile!.user_id);
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

  const handleMachineSelect = (machineId: string) => {
    const machine = userMachines.find(m => m.id === machineId);
    if (machine) {
      setSelectedMachine(machineId);
      initializeChat(machineId, machine.name);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() && selectedMachine) {
      sendMessage(inputMessage, selectedMachine);
      setInputMessage("");
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
          <h1 className="text-3xl font-bold text-foreground">Assistant IA MAIA</h1>
          <p className="text-muted-foreground">Votre assistant intelligent pour la maintenance</p>
        </div>
        <div className="bg-gradient-primary p-3 rounded-lg">
          <Bot className="w-8 h-8 text-white" />
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
              onValueChange={handleMachineSelect}
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
                  <span className="text-sm">{selectedMachineData.documentation_url ? 'Disponible' : 'Non disponible'}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Interface */}
      {selectedMachine ? (
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat avec MAIA
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                MAIA Ready
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-muted/50 mb-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {message.role === 'user' ? (
                        <UserIcon className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card border'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.created_at && (
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-card border p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Décrivez le problème ou posez une question à MAIA..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-[400px] flex items-center justify-center">
          <CardContent className="text-center">
            <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Sélectionnez une machine
            </h3>
            <p className="text-muted-foreground">
              Choisissez une machine ci-dessus pour commencer à interagir avec MAIA
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};