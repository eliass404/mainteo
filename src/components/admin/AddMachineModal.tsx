import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const departments = [
  "Production",
  "Maintenance",
  "Qualité", 
  "Logistique",
  "R&D"
];

const machineTypes = [
  "Presse",
  "Compresseur",
  "Convoyeur",
  "Fraiseuse",
  "Tour",
  "Robot"
];

export const AddMachineModal = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    serialNumber: "",
    department: "",
    assignedTech: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Nouvelle machine:", formData);
    setOpen(false);
    // Reset form
    setFormData({
      name: "",
      type: "",
      location: "",
      serialNumber: "",
      department: "",
      assignedTech: ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Machine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la machine</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Ex: Presse hydraulique A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Numéro de série</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({...prev, serialNumber: e.target.value}))}
                placeholder="Ex: SN-2024-001"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de machine</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {machineTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Emplacement</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                placeholder="Ex: Atelier 1"
                required
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="assignedTech">Technicien assigné</Label>
            <Input
              id="assignedTech"
              value={formData.assignedTech}
              onChange={(e) => setFormData(prev => ({...prev, assignedTech: e.target.value}))}
              placeholder="Ex: Jean Dupont"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Ajouter la machine
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};