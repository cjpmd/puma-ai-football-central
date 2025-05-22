
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser, Team, Club } from '@/types';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  teams: Team[];
  clubs: Club[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: Session | null;
  }>;
  signUp: (email: string, password: string, name: string) => Promise<{
    error: Error | null;
    data: { user: User | null; session: Session | null };
  }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set up the auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlocks
        if (session?.user) {
          setTimeout(async () => {
            await fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setTeams([]);
          setClubs([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchUserTeams(),
        fetchUserClubs()
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        const userProfile: AppUser = {
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          roles: data.roles,
        };
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchUserTeams = async () => {
    try {
      // First get the team IDs the user is associated with
      const { data: userTeamData, error: userTeamError } = await supabase
        .from('user_teams')
        .select('team_id, role')
        .eq('user_id', user?.id);

      if (userTeamError) {
        console.error('Error fetching user teams:', userTeamError);
        return;
      }

      if (!userTeamData || userTeamData.length === 0) {
        setTeams([]);
        return;
      }

      // Get the actual team data
      const teamIds = userTeamData.map(ut => ut.team_id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return;
      }

      // Map the data to our Team type
      const formattedTeams: Team[] = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        ageGroup: team.age_group,
        seasonStart: team.season_start,
        seasonEnd: team.season_end,
        clubId: team.club_id,
        subscriptionType: team.subscription_type,
        gameFormat: team.game_format,
        kitIcons: team.kit_icons,
        performanceCategories: team.performance_categories,
        createdAt: team.created_at,
        updatedAt: team.updated_at
      }));

      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error in fetchUserTeams:', error);
    }
  };

  const fetchUserClubs = async () => {
    try {
      // First get the club IDs the user is associated with
      const { data: userClubData, error: userClubError } = await supabase
        .from('user_clubs')
        .select('club_id, role')
        .eq('user_id', user?.id);

      if (userClubError) {
        console.error('Error fetching user clubs:', userClubError);
        return;
      }

      if (!userClubData || userClubData.length === 0) {
        setClubs([]);
        return;
      }

      // Get the actual club data
      const clubIds = userClubData.map(uc => uc.club_id);
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds);

      if (clubsError) {
        console.error('Error fetching clubs:', clubsError);
        return;
      }

      // Map the data to our Club type
      const formattedClubs: Club[] = clubsData.map(club => ({
        id: club.id,
        name: club.name,
        referenceNumber: club.reference_number || '',
        teams: [], // We'll need a separate query to get this
        subscriptionType: club.subscription_type,
        createdAt: club.created_at,
        updatedAt: club.updated_at
      }));

      setClubs(formattedClubs);
    } catch (error) {
      console.error('Error in fetchUserClubs:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data: data.session, error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { data: null, error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      return { data, error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { 
        error: error as Error, 
        data: { user: null, session: null } 
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTeams([]);
    setClubs([]);
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const value = {
    session,
    user,
    profile,
    teams,
    clubs,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
