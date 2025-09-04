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
              <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl border border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Statut</span>
                      <div className="mt-1">{selectedMachineData?.status && getStatusBadge(selectedMachineData.status)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Emplacement</span>
                      <p className="text-sm font-medium">{selectedMachineData?.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Documentation</span>
                      <p className="text-sm font-medium">{selectedMachineData?.documentation_url ? 'Disponible' : 'Non disponible'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Interface */}
      {selectedMachine ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">MAIA Assistant</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                      Assistant IA pour {selectedMachineData?.name}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">En ligne</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/20">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                      <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                        <Bot className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        Bonjour ! Je suis MAIA
                      </h3>
                      <p className="text-muted-foreground max-w-md leading-relaxed">
                        Votre assistant IA pour la maintenance. Décrivez votre problème ou posez-moi des questions sur la machine {selectedMachineData?.name}.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 animate-fade-in ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-4 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform hover:scale-105 ${
                            message.role === 'user' 
                              ? 'bg-gradient-primary text-white' 
                              : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          }`}>
                            {message.role === 'user' ? (
                              <UserIcon className="w-5 h-5" />
                            ) : (
                              <Bot className="w-5 h-5" />
                            )}
                          </div>
                          <div className={`group relative ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block px-6 py-4 rounded-3xl shadow-sm transition-all duration-200 hover:shadow-md ${
                              message.role === 'user' 
                                ? 'bg-gradient-primary text-primary-foreground rounded-br-lg max-w-xs' 
                                : 'bg-white dark:bg-card border border-border/20 rounded-bl-lg'
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                {message.content}
                              </p>
                            </div>
                            {message.created_at && (
                              <p className={`text-xs mt-2 opacity-70 transition-opacity group-hover:opacity-100 ${
                                message.role === 'user' ? 'text-right' : 'text-left'
                              }`}>
                                {new Date(message.created_at).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isLoading && (
                    <div className="flex gap-4 justify-start animate-fade-in">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white dark:bg-card border border-border/20 px-6 py-4 rounded-3xl rounded-bl-lg shadow-sm">
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Tapez votre message..."
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isLoading}
                        className="pr-12 h-12 rounded-full border-2 focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!inputMessage.trim() || isLoading}
                      size="icon"
                      className="h-12 w-12 rounded-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      ) : (
        <Card className="h-[500px] flex items-center justify-center">
          <CardContent className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Sélectionnez une machine
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Choisissez une machine ci-dessus pour commencer à interagir avec MAIA, votre assistant IA pour la maintenance industrielle.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};