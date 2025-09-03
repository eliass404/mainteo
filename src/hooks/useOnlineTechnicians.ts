import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlineTechnician {
  user_id: string;
  username: string;
  last_seen: string;
}

export const useOnlineTechnicians = () => {
  const [onlineTechnicians, setOnlineTechnicians] = useState<OnlineTechnician[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Track current user as online
    const trackOnlineStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update last_seen in chat_messages to track activity
        await supabase
          .from('chat_messages')
          .upsert({
            technician_id: user.id,
            machine_id: 'online_status',
            content: 'online',
            role: 'system'
          });
      }
    };

    // Get online technicians (those who have sent messages in last 5 minutes)
    const getOnlineTechnicians = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: recentActivity } = await supabase
        .from('chat_messages')
        .select(`
          technician_id,
          created_at,
          profiles!inner(username, role)
        `)
        .gte('created_at', fiveMinutesAgo)
        .eq('profiles.role', 'technicien');

      if (recentActivity) {
        // Group by technician and get the latest activity
        const technicianMap = new Map();
        recentActivity.forEach((activity: any) => {
          const existing = technicianMap.get(activity.technician_id);
          if (!existing || new Date(activity.created_at) > new Date(existing.last_seen)) {
            technicianMap.set(activity.technician_id, {
              user_id: activity.technician_id,
              username: activity.profiles.username,
              last_seen: activity.created_at
            });
          }
        });

        const onlineTechs = Array.from(technicianMap.values());
        setOnlineTechnicians(onlineTechs);
        setOnlineCount(onlineTechs.length);
      }
    };

    // Initial tracking
    trackOnlineStatus();
    getOnlineTechnicians();

    // Set up intervals
    const trackInterval = setInterval(trackOnlineStatus, 60000); // Track every minute
    const updateInterval = setInterval(getOnlineTechnicians, 30000); // Update every 30 seconds

    // Set up real-time subscription for chat activity
    const channel = supabase
      .channel('technician-activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          getOnlineTechnicians();
        }
      )
      .subscribe();

    return () => {
      clearInterval(trackInterval);
      clearInterval(updateInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    onlineTechnicians,
    onlineCount
  };
};