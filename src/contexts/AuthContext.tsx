import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Team, Club } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: any;
  profile: Profile | null;
  teams: Team[];
  clubs: Club[];
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          await fetchTeams(session.user.id);
          await fetchClubs(session.user.id);
        }
      } catch (error: any) {
        console.error('Error loading session:', error);
        toast({
          title: 'Session load failed',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Set up listener for supabase auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        await fetchTeams(session.user.id);
        await fetchClubs(session.user.id);
      } else {
        setUser(null);
        setTeams([]);
        setClubs([]);
        setProfile(null);
      }
    });
  }, [toast]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      toast({
        title: 'Profile fetch failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchTeams = async (userId: string) => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('user_teams')
        .select('team_id')
        .eq('user_id', userId);

      if (teamsError) {
        throw teamsError;
      }

      // Fetch full team details for each team_id
      const teamDetails = await Promise.all(
        teamsData.map(async (userTeam) => {
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', userTeam.team_id)
            .single();

          if (teamError) {
            console.error(`Error fetching team ${userTeam.team_id}:`, teamError);
            return null;
          }
          return teamData;
        })
      );

      // Filter out any null results (failed fetches)
      const validTeams = teamDetails.filter(team => team !== null);
      setTeams(validTeams as Team[]);

    } catch (error: any) {
      console.error('Error fetching teams:', error.message);
      toast({
        title: 'Teams fetch failed',
        description: error.message,
        variant: 'destructive',
      });
      setTeams([]);
    }
  };

  const fetchClubs = async (userId: string) => {
    try {
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_clubs')
        .select('club_id')
        .eq('user_id', userId);

      if (clubsError) {
        throw clubsError;
      }

      // Fetch full club details for each club_id
      const clubDetails = await Promise.all(
        clubsData.map(async (userClub) => {
          const { data: clubData, error: clubError } = await supabase
            .from('clubs')
            .select('*')
            .eq('id', userClub.club_id)
            .single();

          if (clubError) {
            console.error(`Error fetching club ${userClub.club_id}:`, clubError);
            return null;
          }
          return clubData;
        })
      );

      // Filter out any null results (failed fetches)
      const validClubs = clubDetails.filter(club => team !== null);
      setClubs(validClubs as Club[]);

    } catch (error: any) {
      console.error('Error fetching clubs:', error.message);
      toast({
        title: 'Clubs fetch failed',
        description: error.message,
        variant: 'destructive',
      });
      setClubs([]);
    }
  };

  const login = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
    } catch (error: any) {
      console.error('Error during login:', error.message);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Reset the user state
      setUser(null);
      setTeams([]);
      setClubs([]);
      setProfile(null);
      // Redirect to home page
      navigate('/');
    } catch (error: any) {
      console.error('Error during logout:', error.message);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      setIsLoading(true);
      try {
        await fetchProfile(user.id);
        await fetchTeams(user.id);
        await fetchClubs(user.id);
      } catch (error: any) {
        console.error('Error refreshing user data:', error.message);
        toast({
          title: 'Refresh failed',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    teams,
    clubs,
    isLoading,
    login,
    logout,
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
