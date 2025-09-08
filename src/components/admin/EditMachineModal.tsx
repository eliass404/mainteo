import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'alert';
  description?: string;
  serial_number?: string;
  manual_content?: string;
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
    status: "operational" as 'operational' | 'maintenance' | 'alert',
    description: "",
    serial_number: "",
    manual_content: ""
  });
  
  const [machineTypes, setMachineTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name,
        type: machine.type,
        location: machine.location,
        status: machine.status,
        description: machine.description || "",
        serial_number: machine.serial_number || "",
        manual_content: machine.manual_content || ""
      });
    }
  }, [machine]);

  useEffect(() => {
    if (open) {
      loadMachineTypes();
    }
  }, [open]);

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

  const clearMachineChats = async (machineId: string) => {
    try {
      // Supprimer tous les messages de chat pour cette machine
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('machine_id', machineId);

      if (error) throw error;

      // Nettoyer le localStorage aussi
      try {
        localStorage.removeItem(`aiChat.messages.${machineId}`);
      } catch (_) {}

      console.log(`Chat messages cleared for machine ${machineId}`);
    } catch (error) {
      console.error('Error clearing chat messages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;

    setLoading(true);
    try {
      // Vérifier si le manuel a été modifié
      const manualChanged = machine.manual_content !== formData.manual_content;

      const { error } = await supabase
        .from('machines')
        .update({
          name: formData.name,
          type: formData.type,
          location: formData.location,
          status: formData.status,
          description: formData.description || null,
          serial_number: formData.serial_number || null,
          manual_content: formData.manual_content || null
        })
        .eq('id', machine.id);

      if (error) throw error;

      // Si le manuel a été modifié, vider les discussions
      if (manualChanged && formData.manual_content?.trim()) {
        await clearMachineChats(machine.id);
        toast({
          title: "Machine mise à jour",
          description: "Machine mise à jour et discussions réinitialisées suite à la modification du manuel.",
        });
      } else {
        toast({
          title: "Machine mise à jour",
          description: "Les informations de la machine ont été mises à jour avec succès.",
        });
      }

      onMachineUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating machine:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la machine",
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
          <DialogTitle>Modifier la machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la machine</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Ex: VLB-67"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Numéro de série</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({...prev, serial_number: e.target.value}))}
                placeholder="Ex: SN123456"
              />
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={formData.status} onValueChange={(value: 'operational' | 'maintenance' | 'alert') => setFormData(prev => ({...prev, status: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Opérationnel</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="alert">Alerte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              placeholder="Description de la machine"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual_content">Manuel technique</Label>
            <Textarea
              id="manual_content"
              value={formData.manual_content}
              onChange={(e) => setFormData(prev => ({...prev, manual_content: e.target.value}))}
              placeholder="Collez ici le contenu complet du manuel technique de la machine..."
              className="min-h-[200px] resize-y"
            />
            <p className="text-sm text-muted-foreground">
              Ce contenu sera utilisé par l'IA pour assister les techniciens.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};