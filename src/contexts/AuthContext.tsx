import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Team, Club, Profile, GameFormat, SubscriptionType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { securityService } from '@/services/securityService';

interface ConnectedPlayer {
  id: string;
  name: string;
  photoUrl?: string;
  team: Team;
  relationship: string;
  squadNumber: number;
  age: number;
}

interface AuthContextType {
  user: any;
  session: any;
  profile: Profile | null;
  teams: Team[];
  clubs: Club[];
  connectedPlayers: ConnectedPlayer[];
  allTeams: Team[]; // Combined teams from direct membership + connected players
  currentTeam: Team | null;
  loading: boolean;
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
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id);
          
          if (!mounted) return;
          
          try {
            if (session?.user) {
              console.log('User session found, setting user data...');
              setUser(session.user);
              setSession(session);
              
              // Enhanced security: Track session and validate security
              setTimeout(() => {
                if (mounted) {
                  securityService.trackSession().catch(error => {
                    console.error('Session tracking error:', error);
                  });
                }
              }, 100);
              
              // Load user data without blocking
              setTimeout(() => {
                if (mounted) {
                  Promise.all([
                    fetchProfile(session.user.id),
                    fetchTeams(session.user.id),
                    fetchClubs(session.user.id),
                    fetchConnectedPlayers(session.user.id)
                  ]).catch(error => {
                    console.error('Error loading user data after auth change:', error);
                  });
                }
              }, 0);
            } else {
              console.log('No user session, clearing data...');
              setUser(null);
              setSession(null);
              setTeams([]);
              setClubs([]);
              setConnectedPlayers([]);
              setAllTeams([]);
              setProfile(null);
            }
          } finally {
            if (mounted && !initialized) {
              console.log('Auth state processed, setting loading to false');
              setLoading(false);
              setInitialized(true);
            }
          }
        });

        // Then check for existing session
        console.log('Checking for existing session...');
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }

        if (!mounted) return;

        if (existingSession?.user) {
          console.log('Existing session found, setting initial state...');
          setUser(existingSession.user);
          setSession(existingSession);
          
          // Load user data in parallel
          setTimeout(() => {
            if (mounted) {
              Promise.all([
                fetchProfile(existingSession.user.id),
                fetchTeams(existingSession.user.id),
                fetchClubs(existingSession.user.id),
                fetchConnectedPlayers(existingSession.user.id)
              ]).catch(error => {
                console.error('Error loading initial user data:', error);
              }).finally(() => {
                if (mounted && !initialized) {
                  console.log('Initial data load complete');
                  setLoading(false);
                  setInitialized(true);
                }
              });
            }
          }, 0);
        } else {
          console.log('No existing session found');
          if (mounted && !initialized) {
            setLoading(false);
            setInitialized(true);
          }
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          toast({
            title: 'Authentication Error',
            description: 'Failed to initialize authentication. Please refresh the page.',
            variant: 'destructive',
          });
          if (!initialized) {
            setLoading(false);
            setInitialized(true);
          }
        }
      }
    };

    // Set a fallback timeout
    initializationTimeout = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn('Auth initialization timeout, forcing loading to false');
        setLoading(false);
        setInitialized(true);
      }
    }, 5000);

    const cleanup = initializeAuth();
    
    return () => {
      mounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      cleanup?.then(cleanupFn => cleanupFn?.());
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
      
      const { data, error } = await supabase
        .from('user_teams')
        .select(`
          role,
          teams (
            id, name, age_group, season_start, season_end, club_id, 
            year_group_id, game_format, subscription_type, 
            performance_categories, kit_icons, logo_url, kit_designs,
            manager_name, manager_email, manager_phone, game_duration,
            header_display_type, header_image_url, created_at, updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }

      console.log('Raw team data:', data);

      if (!data || data.length === 0) {
        console.log('No teams found for user');
        setTeams([]);
        return;
      }

      // Deduplicate teams by team ID and aggregate roles
      const teamMap = new Map<string, Team>();
      
      data.forEach((item: any) => {
        const teamId = item.teams.id;
        
        if (teamMap.has(teamId)) {
          // Team already exists, add the new role to its roles array
          const existingTeam = teamMap.get(teamId)!;
          // Aggregate roles logic would go here
        } else {
          // Create new team entry
          const teamData: Team = {
            id: item.teams.id,
            name: item.teams.name,
            ageGroup: item.teams.age_group,
            seasonStart: item.teams.season_start,
            seasonEnd: item.teams.season_end,
            clubId: item.teams.club_id,
            yearGroupId: item.teams.year_group_id,
            gameFormat: item.teams.game_format as GameFormat,
            subscriptionType: (item.teams.subscription_type as SubscriptionType) || 'free',
            performanceCategories: item.teams.performance_categories || [],
            kitIcons: typeof item.teams.kit_icons === 'object' && item.teams.kit_icons !== null ? 
              item.teams.kit_icons as { home: string; away: string; training: string; goalkeeper: string; } : 
              { home: '', away: '', training: '', goalkeeper: '' },
            logoUrl: item.teams.logo_url,
            kitDesigns: item.teams.kit_designs ? item.teams.kit_designs as any : undefined,
            managerName: item.teams.manager_name,
            managerEmail: item.teams.manager_email,
            managerPhone: item.teams.manager_phone,
            gameDuration: item.teams.game_duration || 90,
            headerDisplayType: item.teams.header_display_type,
            headerImageUrl: item.teams.header_image_url,
            createdAt: item.teams.created_at,
            updatedAt: item.teams.updated_at,
            // Keep existing properties for backward compatibility
          };
          
          teamMap.set(teamId, teamData);
        }
      });

      const deduplicatedTeams = Array.from(teamMap.values());
      console.log('Deduplicated teams:', deduplicatedTeams);
      setTeams(deduplicatedTeams);
      
      // Update allTeams after teams are loaded
      updateAllTeams(deduplicatedTeams);

    } catch (error: any) {
      console.error('Error in fetchTeams:', error);
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
          
          return {
            id: clubData.id,
            name: clubData.name,
            referenceNumber: clubData.reference_number,
            serialNumber: clubData.serial_number,
            teams: [],
            subscriptionType: clubData.subscription_type,
            officials: [],
            facilities: [],
            createdAt: clubData.created_at,
            updatedAt: clubData.updated_at,
          } as Club;
        })
      );

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

  const fetchConnectedPlayers = async (userId: string) => {
    try {
      console.log('Fetching connected players for user:', userId);
      const { data: playerConnections, error: connectionsError } = await supabase
        .from('user_players')
        .select(`
          player_id,
          relationship,
          players!inner(
            id,
            name,
            squad_number,
            date_of_birth,
            photo_url,
            team_id,
            teams!inner(*)
          )
        `)
        .eq('user_id', userId);

      if (connectionsError) {
        throw connectionsError;
      }

      if (!playerConnections || playerConnections.length === 0) {
        console.log('No connected players found for user');
        setConnectedPlayers([]);
        return;
      }

      const connectedPlayersData: ConnectedPlayer[] = playerConnections.map(connection => {
        const player = connection.players;
        const team = player.teams;
        const age = new Date().getFullYear() - new Date(player.date_of_birth).getFullYear();
        
        return {
          id: player.id,
          name: player.name,
          photoUrl: player.photo_url,
          team: {
            id: team.id,
            name: team.name,
            ageGroup: team.age_group,
            seasonStart: team.season_start,
            seasonEnd: team.season_end,
            clubId: team.club_id,
            yearGroupId: team.year_group_id,
            subscriptionType: team.subscription_type,
            gameFormat: team.game_format,
            gameDuration: team.game_duration || 90,
            kitIcons: (team.kit_icons as any) || { home: '', away: '', training: '', goalkeeper: '' },
            logoUrl: team.logo_url,
            kitDesigns: team.kit_designs,
            performanceCategories: team.performance_categories || [],
            managerName: team.manager_name,
            managerEmail: team.manager_email,
            managerPhone: team.manager_phone,
            headerDisplayType: team.header_display_type,
            headerImageUrl: team.header_image_url,
            createdAt: team.created_at,
            updatedAt: team.updated_at,
          } as Team,
          relationship: connection.relationship,
          squadNumber: player.squad_number,
          age: age
        };
      });

      setConnectedPlayers(connectedPlayersData);
      console.log('Connected players loaded successfully:', connectedPlayersData.length);
      
      // Update allTeams with connected player teams
      updateAllTeams(teams, connectedPlayersData.map(cp => cp.team));

    } catch (error: any) {
      console.error('Error fetching connected players:', error.message);
      toast({
        title: 'Connected players fetch failed',
        description: error.message,
        variant: 'destructive',
      });
      setConnectedPlayers([]);
    }
  };

  const updateAllTeams = (directTeams: Team[] = teams, connectedTeams: Team[] = []) => {
    // Combine direct teams and connected player teams, removing duplicates
    const allTeamsMap = new Map<string, Team>();
    
    // Add direct teams
    directTeams.forEach(team => {
      allTeamsMap.set(team.id, team);
    });
    
    // Add connected player teams
    connectedTeams.forEach(team => {
      if (!allTeamsMap.has(team.id)) {
        allTeamsMap.set(team.id, team);
      }
    });
    
    const combinedTeams = Array.from(allTeamsMap.values());
    setAllTeams(combinedTeams);
    console.log('All teams updated:', combinedTeams.length);
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
    console.log('Starting signOut process...');
    setLoading(true);
    
    try {
      // Clear local state immediately to prevent UI issues
      setUser(null);
      setSession(null);
      setTeams([]);
      setClubs([]);
      setConnectedPlayers([]);
      setAllTeams([]);
      setProfile(null);
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
        toast({
          title: 'Sign out warning',
          description: 'Local session cleared, but there may have been an issue with the server.',
          variant: 'destructive',
        });
      } else {
        console.log('Sign out successful');
      }
      
      // Navigate to auth page instead of home
      navigate('/auth');
    } catch (error: any) {
      console.error('Error during sign out:', error);
      toast({
        title: 'Sign out completed',
        description: 'You have been signed out locally.',
      });
      
      // Navigate regardless of error
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
  };

  const refreshUserData = async () => {
    if (user) {
      setLoading(true);
      try {
        await Promise.all([
          fetchProfile(user.id),
          fetchTeams(user.id),
          fetchClubs(user.id),
          fetchConnectedPlayers(user.id)
        ]);
      } catch (error: any) {
        console.error('Error refreshing user data:', error.message);
        toast({
          title: 'Refresh failed',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    teams,
    clubs,
    connectedPlayers,
    allTeams,
    currentTeam: allTeams && allTeams.length > 0 ? allTeams[0] : null,
    loading,
    login,
    logout: signOut,
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
