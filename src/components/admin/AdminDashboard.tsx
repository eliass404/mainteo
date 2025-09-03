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
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddMachineModal } from "./AddMachineModal";
import { AddUserModal } from "./AddUserModal";
import { EditMachineModal } from "./EditMachineModal";
import { EditUserModal } from "./EditUserModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


import { useState, useEffect } from "react";
import { useMachines } from "@/hooks/useMachines";
import { useOnlineTechnicians } from "@/hooks/useOnlineTechnicians";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AdminDashboard = () => {
  const { machines, loading: machinesLoading, fetchMachines } = useMachines();
  const { onlineCount } = useOnlineTechnicians();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalMachines: 0,
    totalTechnicians: 0,
    activeInterventions: 0,
    alerts: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  useEffect(() => {
    if (machines.length > 0) {
      updateStats();
    }
  }, [machines]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        throw error;
      }

      // Get machine counts for technicians
      const usersWithCounts = await Promise.all(
        (data || []).map(async (user) => {
          const { count } = await supabase
            .from('machines')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_technician_id', user.user_id);

          return {
            ...user,
            machinesCount: count || 0
          };
        })
      );

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
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

  const handleDeleteMachine = async (machineId: string) => {
    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) throw error;

      toast({
        title: "Machine supprimée",
        description: "La machine a été supprimée avec succès.",
      });

      fetchMachines(); // Refresh machines list
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la machine",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès.",
      });

      loadUsers(); // Refresh users list
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
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
                <p className="text-sm font-medium text-muted-foreground">Techniciens en ligne</p>
                <p className="text-3xl font-bold text-foreground">
                  {onlineCount}
                </p>
                <p className="text-xs text-muted-foreground">utilisant le chatbot</p>
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
              <Input 
                placeholder="Rechercher une machine..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="operational">Opérationnel</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="alert">Alerte</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Array.from(new Set(machines.map(m => m.department))).map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                machines
                  .filter(machine => {
                    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        machine.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        machine.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        machine.department.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
                    const matchesDepartment = departmentFilter === "all" || machine.department === departmentFilter;
                    return matchesSearch && matchesStatus && matchesDepartment;
                  })
                  .map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">{machine.id}</TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>{machine.type}</TableCell>
                    <TableCell>{machine.location}</TableCell>
                    <TableCell>{machine.department}</TableCell>
                    <TableCell>{getStatusBadge(machine.status)}</TableCell>
                    <TableCell>
                      {users.find(u => u.user_id === machine.assigned_technician_id)?.username || 'Non assigné'}
                    </TableCell>
                    <TableCell>{machine.next_maintenance || 'Non programmée'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMachine(machine)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer la machine "{machine.name}" ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMachine(machine.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Unified User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <AddUserModal />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Machines Assignées</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé. Ajoutez votre premier utilisateur.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || 'Non spécifié'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Administrateur' : 'Technicien'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.role === 'technicien' ? user.machinesCount : '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer l'utilisateur "{user.username}" ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Modals */}
      <EditMachineModal
        machine={editingMachine}
        open={!!editingMachine}
        onOpenChange={(open) => !open && setEditingMachine(null)}
        onMachineUpdated={() => {
          fetchMachines();
          loadUsers();
        }}
      />
      
      <EditUserModal
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onUserUpdated={loadUsers}
      />

    </div>
  );
};