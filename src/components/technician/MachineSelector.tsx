import { useState, useEffect } from "react";
import { useMachines } from "@/hooks/useMachines";
import { useMachineFamilies } from "@/hooks/useMachineFamilies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Wrench, AlertTriangle, CheckCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'alert';
  description?: string;
  serial_number?: string;
  family_id?: string;
  machine_families?: {
    name: string;
  };
}

interface MachineSelectorProps {
  selectedMachine: string | null;
  onMachineSelect: (machineId: string) => void;
}

export const MachineSelector = ({ selectedMachine, onMachineSelect }: MachineSelectorProps) => {
  const { getUserMachines } = useMachines();
  const { families } = useMachineFamilies();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const machinesData = await getUserMachines();
      setMachines(machinesData);
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Opérationnel';
      case 'maintenance':
        return 'Maintenance';
      case 'alert':
        return 'Alerte';
      default:
        return status;
    }
  };

  const toggleFamily = (familyId: string) => {
    const newOpenFamilies = new Set(openFamilies);
    if (newOpenFamilies.has(familyId)) {
      newOpenFamilies.delete(familyId);
    } else {
      newOpenFamilies.add(familyId);
    }
    setOpenFamilies(newOpenFamilies);
  };

  // Regrouper les machines par famille
  const machinesByFamily = machines.reduce((acc, machine) => {
    const familyId = machine.family_id || 'no-family';
    if (!acc[familyId]) {
      acc[familyId] = [];
    }
    acc[familyId].push(machine);
    return acc;
  }, {} as Record<string, Machine[]>);

  // Machines sans famille
  const machinesWithoutFamily = machinesByFamily['no-family'] || [];

  if (loading) {
    return <div className="p-4 text-center">Chargement des machines...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Sélectionner une machine</h3>
      
      {/* Familles de machines */}
      {families.map((family) => {
        const familyMachines = machinesByFamily[family.id] || [];
        const isOpen = openFamilies.has(family.id);
        
        if (familyMachines.length === 0) return null;

        return (
          <Card key={family.id} className="overflow-hidden">
            <Collapsible 
              open={isOpen} 
              onOpenChange={() => toggleFamily(family.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-base">{family.name}</CardTitle>
                      <Badge variant="secondary">
                        {familyMachines.length} machine{familyMachines.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  {family.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {family.description}
                    </p>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {familyMachines.map((machine) => (
                      <Button
                        key={machine.id}
                        variant={selectedMachine === machine.id ? "default" : "outline"}
                        className="w-full justify-start h-auto p-3"
                        onClick={() => onMachineSelect(machine.id)}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          {getStatusIcon(machine.status)}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {machine.location} • {machine.type}
                              {machine.serial_number && ` • ${machine.serial_number}`}
                            </div>
                          </div>
                          <Badge 
                            variant={machine.status === 'operational' ? 'default' : 
                                   machine.status === 'maintenance' ? 'secondary' : 'destructive'}
                          >
                            {getStatusLabel(machine.status)}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Machines sans famille */}
      {machinesWithoutFamily.length > 0 && (
        <Card>
          <Collapsible 
            open={openFamilies.has('no-family')} 
            onOpenChange={() => toggleFamily('no-family')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {openFamilies.has('no-family') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-base">Machines sans famille</CardTitle>
                    <Badge variant="secondary">
                      {machinesWithoutFamily.length} machine{machinesWithoutFamily.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {machinesWithoutFamily.map((machine) => (
                    <Button
                      key={machine.id}
                      variant={selectedMachine === machine.id ? "default" : "outline"}
                      className="w-full justify-start h-auto p-3"
                      onClick={() => onMachineSelect(machine.id)}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        {getStatusIcon(machine.status)}
                        <div className="flex-1 text-left">
                          <div className="font-medium">{machine.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {machine.location} • {machine.type}
                            {machine.serial_number && ` • ${machine.serial_number}`}
                          </div>
                        </div>
                        <Badge 
                          variant={machine.status === 'operational' ? 'default' : 
                                 machine.status === 'maintenance' ? 'secondary' : 'destructive'}
                        >
                          {getStatusLabel(machine.status)}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {machines.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucune machine disponible
          </CardContent>
        </Card>
      )}
    </div>
  );
};