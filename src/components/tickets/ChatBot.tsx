import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  ticketId: string;
  machineId: string;
  machineName: string;
}

export const ChatBot = ({ ticketId, machineId, machineName }: ChatBotProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: `Bonjour ! Je suis l'assistant IA pour la maintenance de ${machineName}. J'ai analysé la notice et le manuel de cette machine. Comment puis-je vous aider avec ce ticket ?`,
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const mockBotResponses = [
    "D'après le manuel de la machine, voici la procédure recommandée...",
    "Cette panne est courante sur ce modèle. Vérifiez d'abord les connexions hydrauliques.",
    "Selon la notice technique, il faut suivre les étapes suivantes : 1) Arrêt de la machine, 2) Purge du système, 3) Vérification des joints.",
    "Je recommande de consulter la page 45 du manuel pour cette procédure spécifique.",
    "Attention : cette intervention nécessite un équipement de protection individuelle selon les consignes de sécurité.",
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Simulation d'une réponse du bot
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-5 h-5 text-primary" />
          Assistant IA - {machineName}
        </CardTitle>
        <CardDescription className="text-sm">
          Assistant basé sur la notice et le manuel de la machine
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="h-60 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-lg">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.isBot ? "justify-start" : "justify-end"}`}
            >
              {message.isBot && (
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={`max-w-[80%] p-2 rounded-lg text-sm ${
                  message.isBot
                    ? "bg-background border"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-70 block mt-1">
                  {message.timestamp.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              
              {!message.isBot && (
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-secondary">
                    <User className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="w-3 h-3" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-background border p-2 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Posez votre question sur la machine..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};