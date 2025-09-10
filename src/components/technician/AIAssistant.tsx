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
  FileCheck,
  Download,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMachines } from "@/hooks/useMachines";
import { useAIChat } from "@/hooks/useAIChat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AIAssistant = () => {
  const { profile } = useAuth();
  const { getUserMachines } = useMachines();
  const { chatMessages, isLoading, isTyping, sendMessage, initializeChat, deleteChatForMachine, messagesEndRef } = useAIChat();
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
      const machines = await getUserMachines();
      setUserMachines(machines);
      
      if (machines.length === 0) {
        toast({
          title: "Aucune machine disponible",
          description: "Aucune machine n'est disponible dans le système.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les machines",
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

  const handleDeleteChat = async () => {
    if (!selectedMachine) return;

    const result = await deleteChatForMachine(selectedMachine);
    
    if (result.success) {
      toast({
        title: "Chat supprimé",
        description: "L'historique du chat a été supprimé avec succès",
      });
      
      // Reinitialize the chat with fresh welcome message
      const machine = userMachines.find(m => m.id === selectedMachine);
      if (machine) {
        initializeChat(selectedMachine, machine.name, { reset: true });
      }
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le chat",
        variant: "destructive",
      });
    }
  };

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
                {userMachines
                  .filter(machine => machine.id && machine.id.trim() !== '')
                  .map((machine) => (
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
                      <p className="text-sm font-medium">{(selectedMachineData?.manual_url || selectedMachineData?.manual_content) ? 'Disponible' : 'Non disponible'}</p>
                      {selectedMachineData?.manual_url && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 ml-2" onClick={downloadManual}>
                          <Download className="w-3 h-3 mr-1" /> Télécharger
                        </Button>
                      )}
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
        <div className="max-w-4xl mx-auto">
          {/* Chat Area */}
          <Card className="h-[700px] flex flex-col glass-card shadow-floating">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm">
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gradient">MAIA Assistant</h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Assistant IA pour {selectedMachineData?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteChat}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover-glow transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le chat
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full border border-success/20 shadow-glow-cyan">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold">En ligne</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 bg-gradient-card">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
                    <div className="w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center mb-8 shadow-glow animate-float">
                      <Bot className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-cyber">
                      Bonjour ! Je suis MAIA
                    </h3>
                    <div className="max-w-md space-y-3">
                      <p className="text-muted-foreground leading-relaxed">
                        Votre assistant IA pour la maintenance. Décrivez votre problème ou posez-moi des questions sur la machine{" "}
                        <span className="font-semibold text-primary">{selectedMachineData?.name}</span>.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                          🔧 Diagnostic
                        </div>
                        <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium border border-accent/20">
                          🛠️ Maintenance
                        </div>
                        <div className="px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium border border-success/20">
                          ⚠️ Sécurité
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 w-full">
                    {chatMessages.map((message, index) => (
                      <div
                        key={message.id || index}
                        className={`flex w-full animate-scale-in ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className={`flex items-start gap-4 max-w-[85%] ${
                          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                        }`}>
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border-2 ${
                            message.role === 'user' 
                              ? 'bg-gradient-primary text-white border-primary/30 hover-glow' 
                              : 'bg-gradient-to-br from-accent to-primary text-white border-accent/30 cyber-glow'
                          }`}>
                            {message.role === 'user' ? (
                              <UserIcon className="w-5 h-5" />
                            ) : (
                              <Bot className="w-5 h-5" />
                            )}
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`flex flex-col ${
                            message.role === 'user' ? 'items-end' : 'items-start'
                          }`}>
                            <div className={`px-5 py-4 rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] ${
                              message.role === 'user' 
                                ? 'bg-gradient-primary text-primary-foreground rounded-tr-sm border-primary/30 shadow-glow' 
                                : 'bg-gradient-glass border-border/50 text-foreground rounded-tl-sm tech-border'
                            } ${message.status === 'error' ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content.split('\n').map((line, i) => (
                                  <div key={i}>
                                    {line.includes('**') ? (
                                      <span dangerouslySetInnerHTML={{
                                        __html: line
                                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>')
                                          .replace(/- (.*?)(?=\n|$)/g, '• $1')
                                      }} />
                                    ) : (
                                      line.replace(/- /g, '• ')
                                    )}
                                  </div>
                                ))}
                              </div>
                              {message.status === 'sending' && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                  Envoi en cours...
                                </div>
                              )}
                            </div>
                            {message.created_at && (
                              <span className="text-xs text-muted-foreground mt-2 px-2 opacity-60">
                                {new Date(message.created_at).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex justify-start animate-fade-in-up">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg border-2 border-accent/30 cyber-glow">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-gradient-glass border border-border/50 px-5 py-4 rounded-2xl rounded-tl-sm shadow-lg backdrop-blur-sm tech-border">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Loading Indicator */}
                    {isLoading && !isTyping && (
                      <div className="flex justify-start animate-fade-in-up">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg border-2 border-accent/30 cyber-glow">
                            <Bot className="w-5 h-5 text-white animate-spin" />
                          </div>
                          <div className="bg-gradient-glass border border-border/50 px-5 py-4 rounded-2xl rounded-tl-sm shadow-lg backdrop-blur-sm">
                            <p className="text-sm text-muted-foreground">MAIA traite votre demande...</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Invisible element for auto-scroll */}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 border-t bg-gradient-to-r from-background/80 to-muted/20 backdrop-blur-sm">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={isLoading}
                      className="pr-12 h-14 rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/90 backdrop-blur-sm shadow-subtle hover:shadow-card text-base"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                      <Send className="w-4 h-4" />
                    </div>
                  </div>
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className="h-14 w-14 rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-glow floating-action border-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/70">
                  <div className="w-1 h-1 bg-primary rounded-full"></div>
                  <span>Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="h-[600px] flex items-center justify-center glass-card shadow-floating">
          <CardContent className="text-center max-w-md animate-fade-in-up">
            <div className="w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-glow animate-float">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-cyber">
              Sélectionnez une machine
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Choisissez une machine ci-dessus pour commencer à interagir avec MAIA, votre assistant IA pour la maintenance industrielle.
            </p>
            <div className="flex justify-center mt-6">
              <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
                🚀 Technologie IA Avancée
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};