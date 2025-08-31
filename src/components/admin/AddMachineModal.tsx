import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X } from "lucide-react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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
    department: ""
  });
  
  const [files, setFiles] = useState({
    notice: null as File | null,
    manual: null as File | null
  });

  
  const handleFileChange = (type: 'notice' | 'manual') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFiles(prev => ({ ...prev, [type]: file }));
    } else {
      alert('Veuillez sélectionner un fichier PDF');
    }
  };

  const removeFile = (type: 'notice' | 'manual') => {
    setFiles(prev => ({ ...prev, [type]: null }));
  };

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type || !formData.location || !formData.department) {
      toast({ title: 'Champs manquants', description: 'Veuillez remplir tous les champs requis.', variant: 'destructive' });
      return;
    }

    const machineId = `M-${crypto.randomUUID()}`;

    try {
      // Upload files if provided
      let notice_url: string | null = null;
      let manual_url: string | null = null;

      if (files.notice) {
        const path = `${machineId}/notice.pdf`;
        const { error } = await supabase.storage.from('machine-documents').upload(path, files.notice, { upsert: true, contentType: 'application/pdf' });
        if (error) throw error;
        notice_url = path;
      }

      if (files.manual) {
        const path = `${machineId}/manual.pdf`;
        const { error } = await supabase.storage.from('machine-documents').upload(path, files.manual, { upsert: true, contentType: 'application/pdf' });
        if (error) throw error;
        manual_url = path;
      }

      const { error: insertError } = await supabase.from('machines').insert({
        id: machineId,
        name: formData.name,
        type: formData.type,
        location: formData.location,
        serial_number: formData.serialNumber,
        department: formData.department,
        notice_url,
        manual_url,
      });

      if (insertError) throw insertError;

      toast({ title: 'Machine ajoutée', description: 'La machine a été créée avec succès.' });
      setOpen(false);
      setFormData({ name: '', type: '', location: '', serialNumber: '', department: '' });
      setFiles({ notice: null, manual: null });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de créer la machine', variant: 'destructive' });
    }
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notice technique (PDF)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                {files.notice ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm">{files.notice.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile('notice')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Cliquer pour sélectionner la notice PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange('notice')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Manuel d'utilisation (PDF)</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                {files.manual ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm">{files.manual.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile('manual')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Cliquer pour sélectionner le manuel PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange('manual')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
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