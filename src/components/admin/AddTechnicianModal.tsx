import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

const departments = [
  "Production",
  "Maintenance", 
  "Qualité",
  "Logistique",
  "R&D"
];

const mockMachines = [
  { id: "M001", name: "Presse hydraulique A", department: "Production" },
  { id: "M002", name: "Compresseur B", department: "Maintenance" },
  { id: "M003", name: "Convoyeur C", department: "Logistique" },
  { id: "M004", name: "Fraiseuse D", department: "Production" },
  { id: "M005", name: "Robot E", department: "Production" }
];

export const AddTechnicianModal = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    assignedMachines: [] as string[]
  });

  const handleMachineToggle = (machineId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedMachines: prev.assignedMachines.includes(machineId)
        ? prev.assignedMachines.filter(id => id !== machineId)
        : [...prev.assignedMachines, machineId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nouveau technicien:", formData);
    setOpen(false);
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      assignedMachines: []
    });
  };

  const filteredMachines = formData.department 
    ? mockMachines.filter(machine => machine.department === formData.department)
    : mockMachines;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Technicien
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau technicien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Ex: Jean Dupont"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                placeholder="jean.dupont@entreprise.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                placeholder="Ex: +33 1 23 45 67 89"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Département</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({...prev, department: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le département" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Machines assignées</Label>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
              {filteredMachines.length > 0 ? (
                <div className="space-y-3">
                  {filteredMachines.map((machine) => (
                    <div key={machine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={machine.id}
                        checked={formData.assignedMachines.includes(machine.id)}
                        onCheckedChange={() => handleMachineToggle(machine.id)}
                      />
                      <Label htmlFor={machine.id} className="text-sm font-normal">
                        {machine.id} - {machine.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {formData.department ? "Aucune machine dans ce département" : "Sélectionnez un département pour voir les machines"}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Ajouter le technicien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};