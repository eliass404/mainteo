import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketCard } from "./TicketCard";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

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

const mockTickets: Ticket[] = [
  {
    id: "T001",
    title: "Fuite d'huile hydraulique",
    description: "Fuite importante détectée sur le circuit hydraulique principal",
    priority: "urgente",
    machineId: "M001",
    machineName: "Presse hydraulique A",
    type: "corrective",
    status: "nouveau",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdBy: "Admin Système",
  },
  {
    id: "T002",
    title: "Maintenance préventive compresseur",
    description: "Vérification et changement des filtres selon planning",
    priority: "moyenne",
    machineId: "M002",
    machineName: "Compresseur B",
    type: "preventive",
    status: "en_cours",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    assignedTo: "Jean Dupont",
    createdBy: "Marie Martin",
  },
  {
    id: "T003",
    title: "Problème de vitesse convoyeur",
    description: "Le convoyeur fonctionne à vitesse réduite depuis ce matin",
    priority: "elevee",
    machineId: "M003",
    machineName: "Convoyeur C",
    type: "corrective",
    status: "termine",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    assignedTo: "Pierre Durand",
    createdBy: "Superviseur Production",
  },
];

interface TicketBoardProps {
  userRole: "admin" | "technician";
  currentUser: string;
}

export const TicketBoard = ({ userRole, currentUser }: TicketBoardProps) => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);

  const handleTakeTicket = (ticketId: string) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, assignedTo: currentUser, status: "en_cours" as const }
        : ticket
    ));
  };

  const getTicketsByStatus = (status: Ticket["status"]) => {
    if (userRole === "technician") {
      return tickets.filter(ticket => 
        ticket.status === status && 
        (ticket.status === "nouveau" || ticket.assignedTo === currentUser)
      );
    }
    return tickets.filter(ticket => ticket.status === status);
  };

  const getStatusConfig = (status: Ticket["status"]) => {
    switch (status) {
      case "nouveau":
        return {
          title: "Nouveaux tickets",
          icon: <Clock className="w-5 h-5" />,
          color: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
        };
      case "en_cours":
        return {
          title: "En cours",
          icon: <AlertTriangle className="w-5 h-5" />,
          color: "text-orange-600",
          bgColor: "bg-orange-50 border-orange-200",
        };
      case "termine":
        return {
          title: "Terminés",
          icon: <CheckCircle className="w-5 h-5" />,
          color: "text-green-600",
          bgColor: "bg-green-50 border-green-200",
        };
    }
  };

  const statuses: Ticket["status"][] = ["nouveau", "en_cours", "termine"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {statuses.map((status) => {
        const config = getStatusConfig(status);
        const statusTickets = getTicketsByStatus(status);
        
        return (
          <Card key={status} className={`flex flex-col ${config.bgColor}`}>
            <CardHeader className="pb-3">
              <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                {config.icon}
                {config.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {statusTickets.length} ticket{statusTickets.length > 1 ? "s" : ""}
                </Badge>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {statusTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun ticket dans cette catégorie
                </p>
              ) : (
                statusTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    userRole={userRole}
                    currentUser={currentUser}
                    onTakeTicket={handleTakeTicket}
                  />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};