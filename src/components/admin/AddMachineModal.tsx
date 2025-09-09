import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";

export const AddMachineModal = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    customType: "",
    location: "",
    serialNumber: "",
    manualContent: ""
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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


  const uploadPdf = async (machineId: string): Promise<string | null> => {
    if (!pdfFile) return null;

    try {
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${machineId}/manual.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('manuals')
        .upload(fileName, pdfFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      return fileName;
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader le fichier PDF",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const finalType = formData.type === "__add_new__" ? formData.customType : formData.type;

    if (!formData.name || !finalType || !formData.location) {
      toast({ title: 'Champs manquants', description: 'Veuillez remplir tous les champs requis.', variant: 'destructive' });
      setUploading(false);
      return;
    }

    if (!formData.manualContent.trim()) {
      toast({ title: 'Manuel requis', description: 'Le contenu du manuel d\'utilisation est obligatoire.', variant: 'destructive' });
      setUploading(false);
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
        setUploading(false);
        return;
      }

      // Upload PDF if provided
      let manualUrl = null;
      if (pdfFile) {
        manualUrl = await uploadPdf(machineId);
        if (!manualUrl) {
          setUploading(false);
          return;
        }
      }

      const { error: insertError } = await supabase.from('machines').insert({
        id: machineId,
        name: formData.name,
        type: finalType,
        location: formData.location,
        serial_number: formData.serialNumber,
        manual_content: formData.manualContent,
        manual_url: manualUrl
      });

      if (insertError) throw insertError;

      toast({ title: 'Machine ajoutée', description: 'La machine a été créée avec succès.' });
      setOpen(false);
      setFormData({ name: '', type: '', customType: '', location: '', serialNumber: '', manualContent: '' });
      setPdfFile(null);
      
      // Refresh the page to update the machines list
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || 'Impossible de créer la machine', variant: 'destructive' });
    } finally {
      setUploading(false);
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

          {/* Upload de fichier PDF */}
          <div className="space-y-2">
            <Label htmlFor="pdfFile">Manuel PDF (optionnel)</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {!pdfFile ? (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Glissez-déposez un fichier PDF ou cliquez pour sélectionner
                  </p>
                  <Input
                    id="pdfFile"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.type === 'application/pdf') {
                        setPdfFile(file);
                      } else {
                        toast({
                          title: "Format invalide",
                          description: "Veuillez sélectionner un fichier PDF",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{pdfFile.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPdfFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Le fichier PDF sera accessible aux techniciens pour téléchargement depuis leur interface.
            </p>
          </div>

          {/* Manuel technique en texte */}
          <div className="space-y-2">
            <Label htmlFor="manualContent">Manuel technique *</Label>
            <Textarea
              id="manualContent"
              value={formData.manualContent}
              onChange={(e) => setFormData(prev => ({...prev, manualContent: e.target.value}))}
              placeholder="Collez ici le contenu complet du manuel technique de la machine..."
              className="min-h-[200px] resize-y"
              required
            />
            <p className="text-sm text-muted-foreground">
              Collez le texte complet du manuel technique. Ce contenu sera utilisé par l'IA pour assister les techniciens.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                "Ajouter la machine"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};