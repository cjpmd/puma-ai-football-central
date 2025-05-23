import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser, Team, Club, UserRole, SubscriptionType, GameFormat } from '@/types';
import { Json } from '@/integrations/supabase/types';

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
        console.log('Auth state changed:', session?.user?.id || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch user data if we have a valid session with a user
        if (session?.user?.id) {
          setTimeout(async () => {
            await fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setTeams([]);
          setClubs([]);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id || 'no user');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.id) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    if (!userId) {
      console.error('No user ID provided to fetchUserData');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching user data for:', userId);
      await Promise.all([
        fetchProfile(userId),
        fetchUserTeams(userId),
        fetchUserClubs(userId)
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
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
          roles: data.roles as UserRole[],
        };
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchUserTeams = async (userId: string) => {
    if (!userId) {
      console.error('No user ID for fetchUserTeams');
      return;
    }

    try {
      console.log('Fetching user teams for user:', userId);
      // First get the team IDs the user is associated with
      const { data: userTeamData, error: userTeamError } = await supabase
        .from('user_teams')
        .select('team_id, role')
        .eq('user_id', userId);

      if (userTeamError) {
        console.error('Error fetching user teams:', userTeamError);
        return;
      }

      if (!userTeamData || userTeamData.length === 0) {
        console.log('No teams found for user');
        setTeams([]);
        return;
      }

      // Get the actual team data
      const teamIds = userTeamData.map(ut => ut.team_id);
      console.log('Found team IDs:', teamIds);
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return;
      }

      // Map the data to our Team type with proper type conversions
      const formattedTeams: Team[] = teamsData.map(team => {
        const kitIconsData = team.kit_icons as Record<string, string> | null;
        const kitIcons = {
          home: kitIconsData?.home || '',
          away: kitIconsData?.away || '',
          training: kitIconsData?.training || '',
          goalkeeper: kitIconsData?.goalkeeper || '',
        };

        return {
          id: team.id,
          name: team.name,
          ageGroup: team.age_group,
          seasonStart: team.season_start,
          seasonEnd: team.season_end,
          clubId: team.club_id,
          subscriptionType: team.subscription_type as SubscriptionType,
          gameFormat: team.game_format as GameFormat,
          kitIcons,
          performanceCategories: team.performance_categories || [],
          managerName: team.manager_name,
          managerEmail: team.manager_email,
          managerPhone: team.manager_phone,
          createdAt: team.created_at,
          updatedAt: team.updated_at
        };
      });

      console.log('Formatted teams:', formattedTeams.length);
      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error in fetchUserTeams:', error);
    }
  };

  const fetchUserClubs = async (userId: string) => {
    if (!userId) {
      console.error('No user ID for fetchUserClubs');
      return;
    }

    try {
      console.log('Fetching user clubs for user:', userId);
      // First get the club IDs the user is associated with
      const { data: userClubData, error: userClubError } = await supabase
        .from('user_clubs')
        .select('club_id, role')
        .eq('user_id', userId);

      if (userClubError) {
        console.error('Error fetching user clubs:', userClubError);
        return;
      }

      if (!userClubData || userClubData.length === 0) {
        console.log('No clubs found for user');
        setClubs([]);
        return;
      }

      // Get the actual club data including serial numbers
      const clubIds = userClubData.map(uc => uc.club_id);
      const { data: clubsData, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds);

      if (clubsError) {
        console.error('Error fetching clubs:', clubsError);
        return;
      }

      // Map the data to our Club type with proper type conversions
      const formattedClubs: Club[] = clubsData.map(club => ({
        id: club.id,
        name: club.name,
        referenceNumber: club.reference_number || '',
        serialNumber: club.serial_number,
        teams: [],
        subscriptionType: club.subscription_type as SubscriptionType,
        createdAt: club.created_at,
        updatedAt: club.updated_at
      }));

      console.log('Formatted clubs:', formattedClubs.length);
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
    if (user?.id) {
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
