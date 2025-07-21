import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  MessageCircle, 
  MoreHorizontal, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

const mockTickets = [
  {
    id: "T001",
    title: "Fuite d'huile hydraulique",
    description: "Fuite importante détectée sur le circuit hydraulique principal",
    priority: "urgente",
    machineId: "M001",
    machineName: "Presse hydraulique A",
    type: "corrective",
    status: "ouvert",
    createdAt: "2024-01-20",
    assignedTo: "Jean Dupont",
    comments: 2
  },
  {
    id: "T002", 
    title: "Maintenance préventive compresseur",
    description: "Vérification et changement des filtres",
    priority: "moyenne",
    machineId: "M002",
    machineName: "Compresseur B",
    type: "preventive",
    status: "en-cours",
    createdAt: "2024-01-19",
    assignedTo: "Marie Martin",
    comments: 1
  },
  {
    id: "T003",
    title: "Problème de vitesse convoyeur",
    description: "Le convoyeur fonctionne à vitesse réduite",
    priority: "elevee",
    machineId: "M003", 
    machineName: "Convoyeur C",
    type: "corrective",
    status: "resolu",
    createdAt: "2024-01-18",
    assignedTo: "Pierre Durand",
    comments: 5
  }
];

interface TicketListProps {
  viewType: 'technician' | 'admin';
  technicianName?: string;
}

export const TicketList = ({ viewType, technicianName }: TicketListProps) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'elevee':
        return <Badge className="bg-orange-500 text-white">Élevée</Badge>;
      case 'moyenne':
        return <Badge className="bg-yellow-500 text-white">Moyenne</Badge>;
      case 'faible':
        return <Badge variant="secondary">Faible</Badge>;
      default:
        return <Badge variant="outline">Inconnue</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ouvert':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Ouvert</Badge>;
      case 'en-cours':
        return <Badge className="bg-blue-500 text-white">En cours</Badge>;
      case 'resolu':
        return <Badge className="bg-green-500 text-white">Résolu</Badge>;
      case 'ferme':
        return <Badge variant="secondary">Fermé</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'preventive':
        return <Badge variant="secondary">Préventive</Badge>;
      case 'corrective':
        return <Badge className="bg-amber-500 text-white">Corrective</Badge>;
      case 'urgence':
        return <Badge variant="destructive">Urgence</Badge>;
      default:
        return <Badge variant="outline">Autre</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ouvert':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'en-cours':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'resolu':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ferme':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Filtrer les tickets selon le type de vue
  const filteredTickets = viewType === 'technician' && technicianName
    ? mockTickets.filter(ticket => ticket.assignedTo === technicianName)
    : mockTickets;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon('ouvert')}
          {viewType === 'technician' ? 'Mes tickets' : 'Gestion des tickets'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Statut</TableHead>
              {viewType === 'admin' && <TableHead>Assigné à</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {ticket.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{ticket.machineName}</div>
                    <div className="text-muted-foreground">{ticket.machineId}</div>
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(ticket.type)}</TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                {viewType === 'admin' && (
                  <TableCell>{ticket.assignedTo}</TableCell>
                )}
                <TableCell>{ticket.createdAt}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{ticket.comments}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};