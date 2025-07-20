import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  Cog, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddMachineModal } from "./AddMachineModal";
import { AddTechnicianModal } from "./AddTechnicianModal";

const mockMachines = [
  {
    id: "M001",
    name: "Presse hydraulique A",
    type: "Presse",
    location: "Atelier 1",
    department: "Production",
    status: "operational",
    lastMaintenance: "2024-01-15",
    nextMaintenance: "2024-02-15",
    assignedTech: "Jean Dupont"
  },
  {
    id: "M002", 
    name: "Compresseur B",
    type: "Compresseur",
    location: "Atelier 2",
    department: "Maintenance", 
    status: "maintenance",
    lastMaintenance: "2024-01-10",
    nextMaintenance: "2024-02-10",
    assignedTech: "Marie Martin"
  },
  {
    id: "M003",
    name: "Convoyeur C",
    type: "Convoyeur",
    location: "Ligne 1",
    department: "Logistique",
    status: "alert",
    lastMaintenance: "2024-01-05",
    nextMaintenance: "2024-01-20",
    assignedTech: "Pierre Durand"
  }
];

const mockTechnicians = [
  { id: 1, name: "Jean Dupont", status: "available", machinesCount: 5 },
  { id: 2, name: "Marie Martin", status: "busy", machinesCount: 3 },
  { id: 3, name: "Pierre Durand", status: "available", machinesCount: 4 }
];

export const AdminDashboard = () => {
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

  const getTechnicianStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success text-success-foreground">Disponible</Badge>;
      case 'busy':
        return <Badge className="bg-warning text-warning-foreground">Occupé</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Machines</p>
                <p className="text-3xl font-bold text-foreground">24</p>
              </div>
              <Cog className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Techniciens</p>
                <p className="text-3xl font-bold text-foreground">8</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interventions en cours</p>
                <p className="text-3xl font-bold text-foreground">3</p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertes</p>
                <p className="text-3xl font-bold text-foreground">1</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machines Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Machines</CardTitle>
            <AddMachineModal />
          </div>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher une machine..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Technicien Assigné</TableHead>
                <TableHead>Prochaine Maintenance</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMachines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">{machine.id}</TableCell>
                  <TableCell>{machine.name}</TableCell>
                  <TableCell>{machine.type}</TableCell>
                  <TableCell>{machine.location}</TableCell>
                  <TableCell>{machine.department}</TableCell>
                  <TableCell>{getStatusBadge(machine.status)}</TableCell>
                  <TableCell>{machine.assignedTech}</TableCell>
                  <TableCell>{machine.nextMaintenance}</TableCell>
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

      {/* Technicians Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Techniciens</CardTitle>
            <AddTechnicianModal />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Machines Assignées</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTechnicians.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell className="font-medium">{tech.name}</TableCell>
                  <TableCell>{getTechnicianStatusBadge(tech.status)}</TableCell>
                  <TableCell>{tech.machinesCount}</TableCell>
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
    </div>
  );
};