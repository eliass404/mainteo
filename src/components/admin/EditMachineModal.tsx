import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  department: string;
  status: 'operational' | 'maintenance' | 'alert';
  description?: string;
  serial_number?: string;
  assigned_technician_id?: string;
}

interface EditMachineModalProps {
  machine: Machine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMachineUpdated: () => void;
}

export const EditMachineModal = ({ machine, open, onOpenChange, onMachineUpdated }: EditMachineModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    department: "",
    status: "operational" as 'operational' | 'maintenance' | 'alert',
    description: "",
    serial_number: "",
    assigned_technician_id: ""
  });
  
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [machineTypes, setMachineTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name,
        type: machine.type,
        location: machine.location,
        department: machine.department,
        status: machine.status,
        description: machine.description || "",
        serial_number: machine.serial_number || "",
        assigned_technician_id: machine.assigned_technician_id || ""
      });
    }
  }, [machine]);

  useEffect(() => {
    loadTechnicians();
    loadDepartments();
    loadMachineTypes();
  }, []);

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .eq('role', 'technicien');
      
      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('department')
        .not('department', 'is', null);
      
      if (error) throw error;
      
      const uniqueDepartments = [...new Set(data?.map(m => m.department) || [])];
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadMachineTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('type')
        .not('type', 'is', null);
      
      if (error) throw error;
      
      const uniqueTypes = [...new Set(data?.map(m => m.type) || [])];
      setMachineTypes(uniqueTypes);
    } catch (error) {
      console.error('Error loading machine types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('machines')
        .update({
          name: formData.name,
          type: formData.type,
          location: formData.location,
          department: formData.department,
          status: formData.status,
          description: formData.description || null,
          serial_number: formData.serial_number || null,
          assigned_technician_id: formData.assigned_technician_id || null,
        })
        .eq('id', machine.id);

      if (error) throw error;

      toast({
        title: "Machine modifiée",
        description: "Les informations de la machine ont été mises à jour avec succès.",
      });

      onMachineUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating machine:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier la machine",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Modifier la machine {machine?.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la machine</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Numéro de série</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({...prev, serial_number: e.target.value}))}
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
                  <SelectItem value="__add_new__">+ Ajouter un nouveau type</SelectItem>
                </SelectContent>
              </Select>
              {formData.type === "__add_new__" && (
                <Input
                  placeholder="Nouveau type de machine"
                  onChange={(e) => setFormData(prev => ({...prev, type: e.target.value}))}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Emplacement</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="__add_new__">+ Ajouter un nouveau département</SelectItem>
                </SelectContent>
              </Select>
              {formData.department === "__add_new__" && (
                <Input
                  placeholder="Nouveau département"
                  onChange={(e) => setFormData(prev => ({...prev, department: e.target.value}))}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({...prev, status: value as 'operational' | 'maintenance' | 'alert'}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Opérationnel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="alert">Alerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technician">Technicien assigné</Label>
            <Select value={formData.assigned_technician_id || "none"} onValueChange={(value) => setFormData(prev => ({...prev, assigned_technician_id: value === "none" ? "" : value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun technicien</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.user_id} value={tech.user_id}>
                    {tech.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Modification..." : "Modifier la machine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};