import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Team, Club, Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: any;
  session: any;
  profile: Profile | null;
  teams: Team[];
  clubs: Club[];
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        console.log('Loading session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }

        if (!mounted) return;

        if (session?.user) {
          console.log('Session found, loading user data...');
          setUser(session.user);
          setSession(session);
          
          // Load user data in parallel
          await Promise.all([
            fetchProfile(session.user.id),
            fetchTeams(session.user.id),
            fetchClubs(session.user.id)
          ]);
        } else {
          console.log('No session found');
        }
      } catch (error: any) {
        console.error('Error loading session:', error);
        if (mounted) {
          toast({
            title: 'Session load failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } finally {
        if (mounted) {
          console.log('Setting loading to false');
          setIsLoading(false);
        }
      }
    };

    loadSession();

    // Set up listener for supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        
        try {
          await Promise.all([
            fetchProfile(session.user.id),
            fetchTeams(session.user.id),
            fetchClubs(session.user.id)
          ]);
        } catch (error) {
          console.error('Error loading user data after auth change:', error);
        }
      } else {
        setUser(null);
        setSession(null);
        setTeams([]);
        setClubs([]);
        setProfile(null);
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Transform the data to match our Profile type
      const transformedProfile: Profile = {
        id: profileData.id,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        roles: profileData.roles || [],
        fa_id: profileData.fa_id,
        coaching_badges: Array.isArray(profileData.coaching_badges) 
          ? profileData.coaching_badges 
          : [],
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      setProfile(transformedProfile);
      console.log('Profile loaded successfully');
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
      console.log('Fetching teams for user:', userId);
      const { data: teamsData, error: teamsError } = await supabase
        .from('user_teams')
        .select('team_id')
        .eq('user_id', userId);

      if (teamsError) {
        throw teamsError;
      }

      if (!teamsData || teamsData.length === 0) {
        console.log('No teams found for user');
        setTeams([]);
        return;
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
          
          // Transform database format to TypeScript format
          return {
            id: teamData.id,
            name: teamData.name,
            ageGroup: teamData.age_group,
            seasonStart: teamData.season_start,
            seasonEnd: teamData.season_end,
            clubId: teamData.club_id,
            subscriptionType: teamData.subscription_type,
            gameFormat: teamData.game_format,
            kitIcons: teamData.kit_icons,
            performanceCategories: teamData.performance_categories || [],
            managerName: teamData.manager_name,
            managerEmail: teamData.manager_email,
            managerPhone: teamData.manager_phone,
            createdAt: teamData.created_at,
            updatedAt: teamData.updated_at,
          } as Team;
        })
      );

      // Filter out any null results (failed fetches)
      const validTeams = teamDetails.filter(team => team !== null);
      setTeams(validTeams as Team[]);
      console.log('Teams loaded successfully:', validTeams.length);

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
      console.log('Fetching clubs for user:', userId);
      const { data: clubsData, error: clubsError } = await supabase
        .from('user_clubs')
        .select('club_id')
        .eq('user_id', userId);

      if (clubsError) {
        throw clubsError;
      }

      if (!clubsData || clubsData.length === 0) {
        console.log('No clubs found for user');
        setClubs([]);
        return;
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
          
          // Transform database format to TypeScript format
          return {
            id: clubData.id,
            name: clubData.name,
            referenceNumber: clubData.reference_number,
            serialNumber: clubData.serial_number,
            teams: [], // Will be populated separately if needed
            subscriptionType: clubData.subscription_type,
            officials: [],
            facilities: [],
            createdAt: clubData.created_at,
            updatedAt: clubData.updated_at,
          } as Club;
        })
      );

      // Filter out any null results (failed fetches)
      const validClubs = clubDetails.filter(club => club !== null);
      setClubs(validClubs as Club[]);
      console.log('Clubs loaded successfully:', validClubs.length);

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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setTeams([]);
      setClubs([]);
      setProfile(null);
    }
    if (error) {
      throw error;
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
      setSession(null);
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
    session,
    profile,
    teams,
    clubs,
    isLoading,
    login,
    logout,
    signIn,
    signUp,
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
