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
        // Update technician activity table
        await supabase
          .from('technician_activity')
          .upsert({
            user_id: user.id,
            last_seen: new Date().toISOString()
          });
      }
    };

    const getOnlineTechnicians = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: recentActivity, error } = await supabase
        .from('technician_activity')
        .select('user_id, last_seen')
        .gte('last_seen', fiveMinutesAgo);

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

      const userIds = recentActivity.map(activity => activity.user_id);
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

      const activityMap = new Map(recentActivity.map(a => [a.user_id, a.last_seen]));
      
      const onlineTechs = profilesData.map((p) => ({
        user_id: p.user_id as string,
        username: p.username as string,
        last_seen: activityMap.get(p.user_id as string) as string,
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

    // Set up real-time subscription for activity changes
    const channel = supabase
      .channel('technician-activity')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_activity'
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