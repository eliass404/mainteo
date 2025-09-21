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
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sélection de machine</h2>
          <p className="text-muted-foreground mt-1">
            Choisissez une machine pour commencer votre intervention
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {machines.length} machine{machines.length > 1 ? 's' : ''} disponible{machines.length > 1 ? 's' : ''}
        </Badge>
      </div>
      
      {/* Familles de machines */}
      {families.map((family) => {
        const familyMachines = machinesByFamily[family.id] || [];
        const isOpen = openFamilies.has(family.id);
        
        if (familyMachines.length === 0) return null;

        return (
          <Card key={family.id} className="overflow-hidden border-0 shadow-md bg-card/50 backdrop-blur-sm hover-glow">
            <Collapsible 
              open={isOpen} 
              onOpenChange={() => toggleFamily(family.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-primary/5 transition-all duration-200 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{family.name}</CardTitle>
                        {family.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {family.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {familyMachines.length} machine{familyMachines.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="grid gap-3">
                    {familyMachines.map((machine) => (
                      <Button
                        key={machine.id}
                        variant={selectedMachine === machine.id ? "default" : "outline"}
                        className={`w-full justify-start h-auto p-4 rounded-xl transition-all duration-200 ${
                          selectedMachine === machine.id 
                            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg" 
                            : "hover:bg-muted/50 hover:shadow-md border-muted-foreground/20"
                        }`}
                        onClick={() => onMachineSelect(machine.id)}
                      >
                        <div className="flex items-center space-x-4 w-full">
                          <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center">
                            {getStatusIcon(machine.status)}
                          </div>
                          <div className="flex-1 text-left space-y-1">
                            <div className="font-semibold text-base">{machine.name}</div>
                            <div className="text-sm opacity-80">
                              📍 {machine.location} • 🔧 {machine.type}
                              {machine.serial_number && ` • S/N: ${machine.serial_number}`}
                            </div>
                          </div>
                          <Badge 
                            variant={machine.status === 'operational' ? 'default' : 
                                   machine.status === 'maintenance' ? 'secondary' : 'destructive'}
                            className="shrink-0"
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
        <Card className="overflow-hidden border-0 shadow-md bg-card/50 backdrop-blur-sm hover-glow">
          <Collapsible 
            open={openFamilies.has('no-family')} 
            onOpenChange={() => toggleFamily('no-family')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-primary/5 transition-all duration-200 bg-gradient-to-r from-muted/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/20 flex items-center justify-center transition-transform duration-200">
                      {openFamilies.has('no-family') ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-lg font-semibold">Machines sans famille</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-muted/20">
                    {machinesWithoutFamily.length} machine{machinesWithoutFamily.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="grid gap-3">
                  {machinesWithoutFamily.map((machine) => (
                    <Button
                      key={machine.id}
                      variant={selectedMachine === machine.id ? "default" : "outline"}
                      className={`w-full justify-start h-auto p-4 rounded-xl transition-all duration-200 ${
                        selectedMachine === machine.id 
                          ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg" 
                          : "hover:bg-muted/50 hover:shadow-md border-muted-foreground/20"
                      }`}
                      onClick={() => onMachineSelect(machine.id)}
                    >
                      <div className="flex items-center space-x-4 w-full">
                        <div className="w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center">
                          {getStatusIcon(machine.status)}
                        </div>
                        <div className="flex-1 text-left space-y-1">
                          <div className="font-semibold text-base">{machine.name}</div>
                          <div className="text-sm opacity-80">
                            📍 {machine.location} • 🔧 {machine.type}
                            {machine.serial_number && ` • S/N: ${machine.serial_number}`}
                          </div>
                        </div>
                        <Badge 
                          variant={machine.status === 'operational' ? 'default' : 
                                 machine.status === 'maintenance' ? 'secondary' : 'destructive'}
                          className="shrink-0"
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
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="pt-12 pb-12 text-center">
            <Wrench className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Aucune machine disponible</h3>
            <p className="text-muted-foreground">
              Aucune machine n'est actuellement assignée à votre compte
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};