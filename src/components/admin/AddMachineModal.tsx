import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, X } from "lucide-react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const AddMachineModal = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    customType: "",
    location: "",
    serialNumber: ""
  });
  
  const [files, setFiles] = useState({
    notice: null as File | null,
    manual: null as File | null
  });

  const [machineTypes, setMachineTypes] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadMachineTypes();
  }, []);

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

  const handleFileChange = (type: 'notice' | 'manual') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setFiles(prev => ({ ...prev, [type]: file }));
    } else {
      toast({
        title: "Type de fichier invalide",
        description: "Seuls les fichiers PDF sont acceptés.",
        variant: "destructive",
      });
    }
  };

  const removeFile = (type: 'notice' | 'manual') => {
    setFiles(prev => ({ ...prev, [type]: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalType = formData.type === "__add_new__" ? formData.customType : formData.type;

    if (!formData.name || !finalType || !formData.location) {
      toast({ title: 'Champs manquants', description: 'Veuillez remplir tous les champs requis.', variant: 'destructive' });
      return;
    }

    if (!files.manual) {
      toast({ title: 'Manuel requis', description: 'Le manuel d\'utilisation est obligatoire.', variant: 'destructive' });
      return;
    }

    try {
      const machineId = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      // Check if machine with same name already exists at this location
      const { data: existingMachine } = await supabase
        .from('machines')
        .select('id')
        .eq('name', formData.name)
        .eq('location', formData.location)
        .single();

      if (existingMachine) {
        toast({ 
          title: 'Machine existante', 
          description: 'Une machine avec ce nom existe déjà à cet emplacement.', 
          variant: 'destructive' 
        });
        return;
      }

      // Upload files to storage
      let notice_url = null;
      let manual_url = null;

      if (files.notice) {
        const noticeFileName = `${machineId}-notice-${Date.now()}.pdf`;
        const { data: noticeData, error: noticeError } = await supabase.storage
          .from('machine-documents')
          .upload(noticeFileName, files.notice);
        
        if (noticeError) throw noticeError;
        notice_url = noticeData.path;
      }

      if (files.manual) {
        const manualFileName = `${machineId}-manual-${Date.now()}.pdf`;
        const { data: manualData, error: manualError } = await supabase.storage
          .from('machine-documents')
          .upload(manualFileName, files.manual);
        
        if (manualError) throw manualError;
        manual_url = manualData.path;
      }

      const { error: insertError } = await supabase.from('machines').insert({
        id: machineId,
        name: formData.name,
        type: finalType,
        location: formData.location,
        serial_number: formData.serialNumber,
        notice_url,
        manual_url
      });

      if (insertError) throw insertError;

      toast({ title: 'Machine ajoutée', description: 'La machine a été créée avec succès.' });
      setOpen(false);
      setFormData({ name: '', type: '', customType: '', location: '', serialNumber: '' });
      setFiles({ notice: null, manual: null });
      
      // Refresh the page to update the machines list
      window.location.reload();
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
                placeholder="Ex: VLB-67"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Numéro de série</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({...prev, serialNumber: e.target.value}))}
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
                <SelectItem value="__add_new__">+ Ajouter un nouveau type</SelectItem>
              </SelectContent>
            </Select>
             {formData.type === "__add_new__" && (
               <Input
                 placeholder="Nouveau type de machine"
                 value={formData.customType}
                 autoFocus
                 onChange={(e) => setFormData(prev => ({...prev, customType: e.target.value}))}
               />
             )}
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

          {/* File uploads */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notice">Notice d'utilisation (PDF)</Label>
              {files.notice ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1 text-sm">{files.notice.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('notice')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange('notice')}
                    className="hidden"
                    id="notice-upload"
                  />
                  <label htmlFor="notice-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center text-gray-500">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm">Cliquez pour télécharger la notice</span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual">Manuel d'utilisation (PDF) *</Label>
              {files.manual ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="w-4 h-4" />
                  <span className="flex-1 text-sm">{files.manual.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('manual')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange('manual')}
                    className="hidden"
                    id="manual-upload"
                  />
                  <label htmlFor="manual-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center text-gray-500">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm">Cliquez pour télécharger le manuel</span>
                    </div>
                  </label>
                </div>
              )}
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