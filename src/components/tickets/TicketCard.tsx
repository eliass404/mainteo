import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, MessageCircle, User, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChatBot } from "./ChatBot";

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: "faible" | "moyenne" | "elevee" | "urgente";
  status: "nouveau" | "en_cours" | "termine";
  machineId: string;
  machineName: string;
  type: "preventive" | "corrective" | "urgence";
  createdAt: Date;
  assignedTo?: string;
  createdBy: string;
}

interface TicketCardProps {
  ticket: Ticket;
  userRole: "admin" | "technician";
  currentUser: string;
  onTakeTicket?: (ticketId: string) => void;
}

export const TicketCard = ({ ticket, userRole, currentUser, onTakeTicket }: TicketCardProps) => {
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "faible": return "bg-green-100 text-green-800 border-green-200";
      case "moyenne": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "elevee": return "bg-orange-100 text-orange-800 border-orange-200";
      case "urgente": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "nouveau": return "bg-blue-100 text-blue-800 border-blue-200";
      case "en_cours": return "bg-orange-100 text-orange-800 border-orange-200";
      case "termine": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleTakeTicket = () => {
    if (onTakeTicket) {
      onTakeTicket(ticket.id);
      toast({
        title: "Ticket pris en charge",
        description: `Vous avez pris en charge le ticket "${ticket.title}"`,
      });
    }
  };

  const canTakeTicket = userRole === "technician" && ticket.status === "nouveau" && !ticket.assignedTo;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{ticket.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              {ticket.machineId} - {ticket.machineName}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className={getStatusColor(ticket.status)}>
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{ticket.description}</p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {ticket.createdAt.toLocaleDateString("fr-FR")} à {ticket.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Créé par: {ticket.createdBy}
          </div>
        </div>

        {ticket.assignedTo && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {ticket.assignedTo.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">Assigné à: {ticket.assignedTo}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {canTakeTicket && (
              <Button 
                size="sm" 
                onClick={handleTakeTicket}
                className="flex items-center gap-1"
              >
                <User className="w-4 h-4" />
                Prendre ce ticket
              </Button>
            )}
            
            {(ticket.assignedTo === currentUser || userRole === "admin") && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowChat(!showChat)}
                className="flex items-center gap-1"
              >
                <MessageCircle className="w-4 h-4" />
                {showChat ? "Fermer chat" : "Chat assistance"}
              </Button>
            )}
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {ticket.type}
          </Badge>
        </div>

        {showChat && (
          <div className="mt-4 border-t pt-4">
            <ChatBot 
              ticketId={ticket.id}
              machineId={ticket.machineId}
              machineName={ticket.machineName}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};