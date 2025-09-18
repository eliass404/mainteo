import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'operational' | 'maintenance' | 'alert';
  description?: string;
  serial_number?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  manual_url?: string;
  notice_url?: string;
  family_id?: string;
  machine_families?: {
    name: string;
  };
}

export const useMachines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select(`
          *,
          machine_families (
            name
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching machines:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les machines",
          variant: "destructive",
        });
      } else {
        setMachines(data as Machine[] || []);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les machines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const addMachine = async (machineData: Omit<Machine, 'id'> & { id: string }) => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .insert([machineData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMachines(prev => [...prev, data as Machine]);
      toast({
        title: "Succès",
        description: "Machine ajoutée avec succès",
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding machine:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la machine",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  // Tous les techniciens voient toutes les machines
  const getUserMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select(`
          *,
          machine_families (
            name
          )
        `)
        .order('name');

      if (error) {
        throw error;
      }

      return data as Machine[] || [];
    } catch (error) {
      console.error('Error fetching machines:', error);
      return [];
    }
  };

  return {
    machines,
    loading,
    fetchMachines,
    addMachine,
    getUserMachines,
  };
};