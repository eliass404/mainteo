import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, X, Download } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'alert';
  description?: string;
  serial_number?: string;
  manual_content?: string;
  manual_url?: string;
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const slugify = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

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
      setCurrentPdfUrl(machine.manual_url || null);
      setPdfFile(null);
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
      
      const uniqueTypes = [...new Set((data?.map(m => m.type?.trim()) || []).filter((t): t is string => !!t && t.length > 0))];
      setMachineTypes(uniqueTypes);
    } catch (error) {
      console.error('Error loading machine types:', error);
    }
  };

  const uploadPdf = async (machineId: string): Promise<string | null> => {
    if (!pdfFile) return null;

    try {
      const fileExt = pdfFile.name.split('.').pop();
      const safeFolder = slugify(machineId);
      const fileName = `${safeFolder}/manual.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('manuals')
        .upload(fileName, pdfFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
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

  const downloadCurrentManual = async () => {
    if (!currentPdfUrl || !machine) return;

    try {
      const { data, error } = await supabase.storage
        .from('manuals')
        .download(currentPdfUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Manuel_${machine.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: "Le manuel a été téléchargé avec succès"
      });
    } catch (error: any) {
      console.error('Error downloading manual:', error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le manuel",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;

    setLoading(true);
    try {
      // Upload new PDF if provided
      let manualUrl = currentPdfUrl;
      if (pdfFile) {
        const uploadedUrl = await uploadPdf(machine.id);
        if (uploadedUrl) {
          manualUrl = uploadedUrl;
        } else {
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('machines')
        .update({
          name: formData.name,
          type: formData.type,
          location: formData.location,
          status: formData.status,
          description: formData.description || null,
          serial_number: formData.serial_number || null,
          manual_content: formData.manual_content || null,
          manual_url: manualUrl
        })
        .eq('id', machine.id);

      if (error) throw error;

      toast({
        title: "Machine mise à jour",
        description: "Les informations de la machine ont été mises à jour avec succès.",
      });

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

          {/* Upload de fichier PDF */}
          <div className="space-y-2">
            <Label htmlFor="pdfFile">Manuel PDF</Label>
            
            {/* Affichage du manuel actuel s'il existe */}
            {currentPdfUrl && !pdfFile && (
              <div className="p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Manuel PDF actuel</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadCurrentManual}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload d'un nouveau fichier */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              {!pdfFile ? (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {currentPdfUrl ? "Remplacer le manuel PDF" : "Glissez-déposez un fichier PDF ou cliquez pour sélectionner"}
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
              {loading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Mettre à jour"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};