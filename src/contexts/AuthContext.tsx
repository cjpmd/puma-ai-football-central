
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Team } from '@/types/team';
import { Club } from '@/types/club';

interface AuthContextType {
  user: User | null;
  profile: Database['public']['Tables']['profiles']['Row'] & { managed_player_ids?: string[] } | null;
  session: Session | null;
  loading: boolean;
  teams: Team[];
  clubs: Club[];
  currentTeam?: Team | null;
  signIn: (email: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  signUp?: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] & { managed_player_ids?: string[] } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

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

      // Fetch user teams with explicit column selection
      const { data: teamsData, error: teamsError } = await supabase
        .from('user_teams')
        .select(`
          team_id,
          teams!user_teams_team_id_fkey (
            id,
            name,
            age_group,
            season_start,
            season_end,
            subscription_type,
            game_format,
            kit_icons,
            logo_url,
            performance_categories,
            manager_name,
            manager_email,
            manager_phone,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (teamsError) {
        console.error('Error fetching user teams:', teamsError);
      } else {
        const userTeams = teamsData?.map(team => ({
          id: team.teams.id,
          name: team.teams.name,
          ageGroup: team.teams.age_group,
          seasonStart: team.teams.season_start,
          seasonEnd: team.teams.season_end,
          subscriptionType: team.teams.subscription_type,
          gameFormat: team.teams.game_format,
          kitIcons: team.teams.kit_icons || { home: '', away: '', training: '', goalkeeper: '' },
          logoUrl: team.teams.logo_url,
          performanceCategories: team.teams.performance_categories || [],
          managerName: team.teams.manager_name,
          managerEmail: team.teams.manager_email,
          managerPhone: team.teams.manager_phone,
          createdAt: team.teams.created_at,
          updatedAt: team.teams.updated_at
        })) || [];
        console.log('User teams:', userTeams);
        setTeams(userTeams);
        
        // Set the first team as current team if available
        if (userTeams.length > 0) {
          setCurrentTeam(userTeams[0]);
        }
      }

      // Fetch user clubs with explicit column selection
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_clubs')
        .select(`
          club_id,
          clubs!user_clubs_club_id_fkey (
            id,
            name,
            reference_number,
            subscription_type,
            serial_number,
            logo_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (clubsError) {
        console.error('Error fetching user clubs:', clubsError);
      } else {
        const userClubs = clubsData?.map(club => ({
          id: club.clubs.id,
          name: club.clubs.name,
          referenceNumber: club.clubs.reference_number,
          subscriptionType: club.clubs.subscription_type || 'free',
          serialNumber: club.clubs.serial_number,
          logoUrl: club.clubs.logo_url,
          createdAt: club.clubs.created_at,
          updatedAt: club.clubs.updated_at
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
      if (error) {
        return { error };
      }
      alert('Check your email for the login link!');
      return {};
    } catch (error: any) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      return { data, error };
    } catch (error: any) {
      return { error };
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
      setCurrentTeam(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  // Alias for signOut to match what Header expects
  const logout = signOut;

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
        setCurrentTeam(null);
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
    currentTeam,
    signIn,
    signOut,
    signUp,
    logout,
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
