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
import { AddUserModal } from "./AddUserModal";


import { useState, useEffect } from "react";
import { useMachines } from "@/hooks/useMachines";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const AdminDashboard = () => {
  const { machines, loading: machinesLoading } = useMachines();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMachines: 0,
    totalTechnicians: 0,
    activeInterventions: 0,
    alerts: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadTechnicians();
    loadStats();
  }, []);

  useEffect(() => {
    if (machines.length > 0) {
      updateStats();
    }
  }, [machines]);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technicien');

      if (error) {
        throw error;
      }

      // Get machine counts for each technician
      const techsWithCounts = await Promise.all(
        (data || []).map(async (tech) => {
          const { count } = await supabase
            .from('machines')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_technician_id', tech.user_id);

          return {
            id: tech.id,
            name: tech.username,
            user_id: tech.user_id,
            status: 'available', // You could add this to the profiles table
            machinesCount: count || 0
          };
        })
      );

      setTechnicians(techsWithCounts);
    } catch (error) {
      console.error('Error loading technicians:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les techniciens",
        variant: "destructive",
      });
    }
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      // Load intervention reports count
      const { count: interventionsCount } = await supabase
        .from('intervention_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en-cours');

      // Load technicians count
      const { count: techniciansCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'technicien');

      setStats(prev => ({
        ...prev,
        totalTechnicians: techniciansCount || 0,
        activeInterventions: interventionsCount || 0
      }));

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const updateStats = () => {
    const totalMachines = machines.length;
    const alerts = machines.filter(m => m.status === 'alert').length;

    setStats(prev => ({
      ...prev,
      totalMachines,
      alerts
    }));
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
                <p className="text-3xl font-bold text-foreground">
                  {loadingStats ? "..." : stats.totalMachines}
                </p>
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
                <p className="text-3xl font-bold text-foreground">
                  {loadingStats ? "..." : stats.totalTechnicians}
                </p>
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
                <p className="text-3xl font-bold text-foreground">
                  {loadingStats ? "..." : stats.activeInterventions}
                </p>
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
                <p className="text-3xl font-bold text-foreground">
                  {loadingStats ? "..." : stats.alerts}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <AddUserModal />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Créez des comptes administrateur et technicien avec des mots de passe sécurisés.
          </div>
        </CardContent>
      </Card>

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
              {machinesLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Chargement des machines...
                    </div>
                  </TableCell>
                </TableRow>
              ) : machines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucune machine trouvée. Ajoutez votre première machine.
                  </TableCell>
                </TableRow>
              ) : (
                machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">{machine.id}</TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>{machine.type}</TableCell>
                    <TableCell>{machine.location}</TableCell>
                    <TableCell>{machine.department}</TableCell>
                    <TableCell>{getStatusBadge(machine.status)}</TableCell>
                    <TableCell>
                      {technicians.find(t => t.user_id === machine.assigned_technician_id)?.name || 'Non assigné'}
                    </TableCell>
                    <TableCell>{machine.next_maintenance || 'Non programmée'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
              {technicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun technicien trouvé. Ajoutez votre premier technicien.
                  </TableCell>
                </TableRow>
              ) : (
                technicians.map((tech) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};