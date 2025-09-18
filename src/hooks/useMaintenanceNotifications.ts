import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MaintenanceNotification {
  id: string;
  machine_id: string;
  message: string;
  notification_date: string;
  is_active: boolean;
  machines?: {
    name: string;
    serial_number?: string;
  };
}

export const useMaintenanceNotifications = () => {
  const [notifications, setNotifications] = useState<MaintenanceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_notifications')
        .select(`
          *,
          machines (
            name,
            serial_number
          )
        `)
        .eq('is_active', true)
        .lte('notification_date', new Date().toISOString().split('T')[0])
        .order('notification_date');

      if (error) {
        console.error('Error fetching maintenance notifications:', error);
      } else {
        setNotifications(data as MaintenanceNotification[] || []);
      }
    } catch (error) {
      console.error('Error fetching maintenance notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_notifications')
        .update({ is_active: false })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Notification supprimée",
        description: "La notification de maintenance a été marquée comme vue",
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    }
  };

  return {
    notifications,
    loading,
    fetchNotifications,
    dismissNotification,
  };
};