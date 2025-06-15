import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Club, Team, SubscriptionType, GameFormat } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  teams: Team[];
  clubs: Club[] | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }

    loadSession();

    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
    });
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setTeams([]);
        setClubs(null);
        return;
      }

      await fetchTeams(user.id);
      await fetchClubs(user.id);
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchTeams = async (userId: string) => {
    try {
      console.log('Fetching teams for user:', userId);
      const { data, error } = await supabase
        .from('user_teams')
        .select('team_id, role, teams(*)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user teams:', error);
        return;
      }

      console.log('Raw team data:', data);

      const convertedTeams: Team[] = (data || []).map(userTeam => {
        const team = userTeam.teams as any;
        return {
          id: team.id,
          name: team.name,
          ageGroup: team.age_group,
          seasonStart: team.season_start,
          seasonEnd: team.season_end,
          clubId: team.club_id,
          gameFormat: team.game_format as GameFormat,
          gameDuration: team.game_duration, // Fix: properly map game_duration from database
          subscriptionType: (team.subscription_type as SubscriptionType) || 'free',
          performanceCategories: team.performance_categories || [],
          kitIcons: typeof team.kit_icons === 'object' && team.kit_icons !== null ? 
            team.kit_icons as { home: string; away: string; training: string; goalkeeper: string; } : 
            { home: '', away: '', training: '', goalkeeper: '' },
          logoUrl: team.logo_url,
          kitDesigns: team.kit_designs ? team.kit_designs as any : undefined,
          managerName: team.manager_name,
          managerEmail: team.manager_email,
          managerPhone: team.manager_phone,
          createdAt: team.created_at,
          updatedAt: team.updated_at
        };
      });

      console.log('Converted teams:', convertedTeams);
      setTeams(convertedTeams);
    } catch (error) {
      console.error('Error in fetchTeams:', error);
    }
  };

  const fetchClubs = async (userId: string) => {
    try {
      console.log('Fetching clubs for user:', userId);
      const { data, error } = await supabase
        .from('user_clubs')
        .select('club_id, role, clubs(*)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user clubs:', error);
        return;
      }

      console.log('Raw club data:', data);

      const convertedClubs: Club[] = (data || []).map(userClub => {
        const club = userClub.clubs as any;
        return {
          id: club.id,
          name: club.name,
          referenceNumber: club.reference_number,
          serialNumber: club.serial_number,
          subscriptionType: (club.subscription_type as SubscriptionType) || 'free',
          logoUrl: club.logo_url,
          createdAt: club.created_at,
          updatedAt: club.updated_at
        };
      });

      console.log('Converted clubs:', convertedClubs);
      setClubs(convertedClubs);
    } catch (error) {
      console.error('Error in fetchClubs:', error);
    }
  };

  const signIn = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      alert('Check your email for the magic link to sign in.');
    } catch (error: any) {
      alert(error.error_description || error.message);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchTeams(user.id);
      await fetchClubs(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    teams,
    clubs,
    isLoading,
    signIn,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
