import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MachineFamily {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const useMachineFamilies = () => {
  const [families, setFamilies] = useState<MachineFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_families')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching machine families:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les familles de machines",
          variant: "destructive",
        });
      } else {
        setFamilies(data as MachineFamily[] || []);
      }
    } catch (error) {
      console.error('Error fetching machine families:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les familles de machines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, []);

  const addFamily = async (familyData: { name: string; description?: string }) => {
    try {
      const { data, error } = await supabase
        .from('machine_families')
        .insert([familyData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setFamilies(prev => [...prev, data as MachineFamily]);
      toast({
        title: "Succès",
        description: "Famille de machines ajoutée avec succès",
      });
      return { success: true, data };
    } catch (error) {
      console.error('Error adding machine family:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la famille de machines",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return {
    families,
    loading,
    fetchFamilies,
    addFamily,
  };
};