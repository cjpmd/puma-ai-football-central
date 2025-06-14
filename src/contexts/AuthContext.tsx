import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  profile: Database['public']['Tables']['profiles']['Row'] | null;
  session: Session | null;
  loading: boolean;
  teams: Array<{ id: string; name: string }>;
  clubs: Array<{ id: string; name: string }>;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [clubs, setClubs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    }

    getSession();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for user:', userId);
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating a new one');
          const { data: newProfileData, error: newProfileError } = await supabase
            .from('profiles')
            .insert([{ id: userId }])
            .select('*')
            .single();

          if (newProfileError) {
            console.error('Error creating new profile:', newProfileError);
            throw newProfileError;
          }

          console.log('New profile created:', newProfileData);
          setProfile(newProfileData);
        } else {
          throw profileError;
        }
      } else {
        console.log('Profile data:', profileData);
        setProfile(profileData);
      }

      // Fetch user teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('user_teams')
        .select('team_id, teams(name)')
        .eq('user_id', userId);

      if (teamsError) {
        console.error('Error fetching user teams:', teamsError);
      } else {
        const userTeams = teamsData?.map(team => ({
          id: team.team_id,
          name: (team.teams as any)?.name || 'Unknown Team'
        })) || [];
        console.log('User teams:', userTeams);
        setTeams(userTeams);
      }

      // Fetch user clubs
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_clubs')
        .select('club_id, clubs(name)')
        .eq('user_id', userId);

      if (clubsError) {
        console.error('Error fetching user clubs:', clubsError);
      } else {
        const userClubs = clubsData?.map(club => ({
          id: club.club_id,
          name: (club.clubs as any)?.name || 'Unknown Club'
        })) || [];
        console.log('User clubs:', userClubs);
        setClubs(userClubs);
      }

    } catch (error: any) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the login link!');
    } catch (error: any) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setTeams([]);
      setClubs([]);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setTeams([]);
        setClubs([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    teams,
    clubs,
    signIn,
    signOut,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
