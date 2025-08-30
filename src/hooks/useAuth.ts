import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  role: 'admin' | 'technicien';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setLoading(true);
        const email = newSession.user.email ?? undefined;
        setTimeout(() => {
          fetchProfile(newSession.user.id, email);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const email = session.user.email ?? undefined;
        fetchProfile(session.user.id, email);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (!data) {
        // Get user metadata to check for role
        const { data: { user } } = await supabase.auth.getUser();
        const userRole = user?.user_metadata?.role || 'technicien';
        const userUsername = user?.user_metadata?.username || (email ? email.split('@')[0] : 'utilisateur');
        
        // Create a profile using the role from signup metadata
        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, username: userUsername, role: userRole })
          .select('*')
          .single();
        if (insertError) {
          console.error('Error creating default profile:', insertError);
        } else {
          setProfile(created as Profile);
        }
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error fetching/creating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, username: string, role: 'admin' | 'technicien') => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { username, role },
      },
    });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };
};