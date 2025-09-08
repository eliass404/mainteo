import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ExtractManualButtonProps {
  machineId: string;
  manualUrl?: string;
  onExtractionComplete?: () => void;
}

export const ExtractManualButton: React.FC<ExtractManualButtonProps> = ({
  machineId,
  manualUrl,
  onExtractionComplete
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const handleExtractManual = async () => {
    if (!manualUrl) {
      toast({
        title: "Erreur",
        description: "Aucun manuel trouvé pour cette machine",
        variant: "destructive"
      });
      return;
    }

    setIsExtracting(true);
    
    try {
      console.log('Starting manual extraction for machine:', machineId);
      
      const { data, error } = await supabase.functions.invoke('extract-manual', {
        body: {
          machineId,
          filePath: manualUrl
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log('Manual extraction completed:', data);

      toast({
        title: "Extraction réussie",
        description: `Manuel extrait avec succès (${data.extractedLength} caractères)`,
      });

      onExtractionComplete?.();

    } catch (error) {
      console.error('Error extracting manual:', error);
      toast({
        title: "Erreur d'extraction",
        description: error instanceof Error ? error.message : "Impossible d'extraire le manuel",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  if (!manualUrl) {
    return null;
  }

  return (
    <Button
      onClick={handleExtractManual}
      disabled={isExtracting}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isExtracting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {isExtracting ? 'Extraction...' : 'Extraire le manuel'}
    </Button>
  );
};