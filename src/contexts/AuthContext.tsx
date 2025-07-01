import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Team, Club } from '@/types';

interface AuthContextType {
  user: User | null;
  teams: Team[];
  clubs: Club[];
  currentTeam: Team | null;
  currentClub: Club | null;
  loading: boolean;
  isLoading: boolean; // Add this property
  profile: User | null; // Add profile property
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  switchTeam: (teamId: string) => void;
  switchClub: (clubId: string) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentClub, setCurrentClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: userDetails, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user details:', userError);
          setLoading(false);
          return;
        }

        setUser(userDetails || session.user);
        await fetchTeamsAndClubs(userDetails?.id || session.user.id);
      }
      setLoading(false);
    };

    loadSession();

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: userDetails, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session?.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user details:', userError);
          setLoading(false);
          return;
        }

        setUser(userDetails || session.user);
        await fetchTeamsAndClubs(userDetails?.id || session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setTeams([]);
        setClubs([]);
        setCurrentTeam(null);
        setCurrentClub(null);
      }
    });
  }, [navigate]);

  const fetchTeamsAndClubs = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch clubs where the user is an official
      const { data: clubOfficials, error: clubOfficialsError } = await supabase
        .from('club_officials')
        .select('club_id, role')
        .eq('user_id', userId);

      if (clubOfficialsError) {
        console.error('Error fetching club officials:', clubOfficialsError);
        throw clubOfficialsError;
      }

      const clubIds = clubOfficials.map(co => co.club_id);

      const { data: userClubs, error: userClubsError } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds);

      if (userClubsError) {
        console.error('Error fetching user clubs:', userClubsError);
        throw userClubsError;
      }

      // Assign user role to each club
      const enrichedClubs = userClubs.map(club => {
        const official = clubOfficials.find(co => co.club_id === club.id);
        return {
          ...club,
          userRole: official?.role || 'Member'
        };
      });

      setClubs(enrichedClubs);
      if (enrichedClubs.length > 0) {
        setCurrentClub(enrichedClubs[0]);
      }

      // Fetch teams where the user is a member
      const { data: userTeams, error: userTeamsError } = await supabase
        .from('user_teams')
        .select('team_id, role')
        .eq('user_id', userId);

      if (userTeamsError) {
        console.error('Error fetching user teams:', userTeamsError);
        throw userTeamsError;
      }

      const teamIds = userTeams.map(ut => ut.team_id);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      setTeams(teamsData);
      if (teamsData.length > 0) {
        setCurrentTeam(teamsData[0]);
      }
    } catch (error) {
      console.error('Error fetching teams and clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data: authResponse, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Sign-in error:', authError);
        setLoading(false);
        return { error: authError };
      }

      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authResponse.user?.id)
        .single();

      if (userError) {
        console.error('Error fetching user details:', userError);
        setLoading(false);
        return { error: userError };
      }

      setUser(userDetails || authResponse.user);
      await fetchTeamsAndClubs(userDetails?.id || authResponse.user?.id);
      navigate('/dashboard');
      return {};
    } catch (error: any) {
      console.error('Authentication error:', error.message);
      setLoading(false);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { data: authResponse, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (authError) {
        console.error('Sign-up error:', authError);
        setLoading(false);
        return { error: authError };
      }

      // Create a user profile in the 'users' table
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authResponse.user?.id,
            email: email,
            name: name,
          },
        ]);

      if (userError) {
        console.error('Error creating user profile:', userError);
        setLoading(false);
        return { error: userError };
      }

      setUser(authResponse.user);
      await fetchTeamsAndClubs(authResponse.user?.id);
      navigate('/dashboard');
      return { data: authResponse };
    } catch (error: any) {
      console.error('Registration error:', error.message);
      setLoading(false);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign-out error:', error);
        throw error;
      }
      setUser(null);
      setTeams([]);
      setClubs([]);
      setCurrentTeam(null);
      setCurrentClub(null);
      navigate('/login');
    } catch (error: any) {
      console.error('Sign-out error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = signOut;

  const switchTeam = (teamId: string) => {
    const team = teams.find(team => team.id === teamId);
    setCurrentTeam(team || null);
  };

  const switchClub = (clubId: string) => {
    const club = clubs.find(club => club.id === clubId);
    setCurrentClub(club || null);
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchTeamsAndClubs(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    teams,
    clubs,
    currentTeam,
    currentClub,
    loading,
    isLoading: loading, // Map loading to isLoading for backward compatibility
    profile: user, // Map user to profile for backward compatibility
    signIn,
    signUp,
    signOut,
    logout: signOut,
    switchTeam,
    switchClub,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
