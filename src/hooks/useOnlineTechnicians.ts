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

    const getOnlineTechnicians = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: recentActivity, error } = await supabase
        .from('chat_messages')
        .select('technician_id, created_at')
        .gte('created_at', fiveMinutesAgo);

      if (error) {
        console.error('Error fetching recent activity:', error);
        setOnlineTechnicians([]);
        setOnlineCount(0);
        return;
      }

      if (!recentActivity || recentActivity.length === 0) {
        setOnlineTechnicians([]);
        setOnlineCount(0);
        return;
      }

      // Group by technician and get the latest activity
      const technicianMap = new Map<string, string>();
      recentActivity.forEach((activity: any) => {
        const prev = technicianMap.get(activity.technician_id);
        if (!prev || new Date(activity.created_at) > new Date(prev)) {
          technicianMap.set(activity.technician_id, activity.created_at);
        }
      });

      const userIds = Array.from(technicianMap.keys());
      if (userIds.length === 0) {
        setOnlineTechnicians([]);
        setOnlineCount(0);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, role')
        .in('user_id', userIds)
        .eq('role', 'technicien');

      if (profilesError || !profilesData) {
        console.error('Error fetching profiles:', profilesError);
        setOnlineTechnicians([]);
        setOnlineCount(0);
        return;
      }

      const onlineTechs = profilesData.map((p) => ({
        user_id: p.user_id as string,
        username: p.username as string,
        last_seen: technicianMap.get(p.user_id as string) as string,
      }));

      setOnlineTechnicians(onlineTechs);
      setOnlineCount(onlineTechs.length);
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