import { useState, useEffect } from 'react';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamForm } from '@/components/teams/TeamForm';
import { TeamSettingsModal } from '@/components/teams/TeamSettingsModal';
import { TeamStaffModal } from '@/components/teams/TeamStaffModal';
import { CodeManagementModal } from '@/components/codes/CodeManagementModal';
import { StaffManagementButton } from '@/components/teams/StaffManagementButton';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useSmartView } from '@/contexts/SmartViewContext';
import { useClubContext } from '@/contexts/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Team, Club, SubscriptionType, GameFormat } from '@/types/index';
import { PlusCircle, Settings, UserPlus, Users, QrCode, Search, Filter, Crown, Building2 } from 'lucide-react';

interface ExtendedTeam extends Team {
  clubName?: string;
  playerCount?: number;
}

const TeamManagement = () => {
  const { clubs, refreshUserData, user } = useAuth();
  const { filteredTeams: teams } = useClubContext();
  const { isGlobalAdmin, isClubAdmin } = useAuthorization();
  const { currentView } = useSmartView();
  const [allTeams, setAllTeams] = useState<ExtendedTeam[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<ExtendedTeam[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [linkedTeams, setLinkedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCodeManagementModalOpen, setIsCodeManagementModalOpen] = useState(false);
  const [codeManagementTeamId, setCodeManagementTeamId] = useState<string>('');
  const { toast } = useToast();

  const isAdminUser = isGlobalAdmin || isClubAdmin();

  useEffect(() => {
    loadData();
  }, [teams, clubs, currentView]);

  useEffect(() => {
    filterTeams();
  }, [allTeams, searchTerm, selectedClub, selectedAgeGroup]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading data for view:', currentView);
      await Promise.all([
        loadAllClubs(),
        loadTeamsForCurrentRole(),
        loadLinkedTeams()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamsForCurrentRole = async () => {
    switch (currentView) {
      case 'global_admin':
        return loadAllTeams();
      case 'club_admin':
        return loadClubTeams();
      case 'team_manager':
      case 'coach':
        return loadUserTeams();
      case 'parent':
        return loadParentTeams();
      default:
        return loadUserTeams();
    }
  };

  const loadClubTeams = async () => {
    if (!clubs || clubs.length === 0) {
      console.log('No clubs available for loading teams');
      return;
    }
    
    try {
      const clubIds = clubs.map(club => club.id);
      console.log('Loading teams for club IDs:', clubIds);
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          clubs!teams_club_id_fkey (name),
          players (count)
        `)
        .in('club_id', clubIds)
        .order('name');

      if (error) throw error;

      console.log('Loaded teams data:', data);

      const convertedTeams: ExtendedTeam[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        ageGroup: team.age_group,
        seasonStart: team.season_start,
        seasonEnd: team.season_end,
        clubId: team.club_id,
        yearGroupId: team.year_group_id,
        gameFormat: team.game_format as GameFormat,
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
        gameDuration: team.game_duration || 90,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        clubName: team.clubs?.name || 'Independent',
        playerCount: team.players?.[0]?.count || 0,
        isReadOnly: false // Club admins can edit all teams in their clubs
      }));

      console.log('Converted teams:', convertedTeams.length, 'teams');
      setAllTeams(convertedTeams);
    } catch (error) {
      console.error('Error loading club teams:', error);
    }
  };

  const loadParentTeams = async () => {
    const convertedTeams: ExtendedTeam[] = teams.map(team => ({
      ...team,
      clubName: getClubName(team.clubId),
      isReadOnly: true // Parents can only view teams
    }));
    
    console.log('Parent teams loaded:', convertedTeams.length);
    setAllTeams(convertedTeams);
  };

  const loadAllClubs = async () => {
    try {
      const { data, error } = await supabase.from('clubs').select('*');
      if (error) throw error;

      const convertedClubs: Club[] = (data || []).map(club => ({
        id: club.id,
        name: club.name,
        referenceNumber: club.reference_number,
        serialNumber: club.serial_number,
        subscriptionType: (club.subscription_type as SubscriptionType) || 'free',
        logoUrl: club.logo_url,
        createdAt: club.created_at,
        updatedAt: club.updated_at
      }));

      setAllClubs(convertedClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  const loadAllTeams = async () => {
    if (!isAdminUser) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          clubs!teams_club_id_fkey (name),
          players (count)
        `)
        .order('name');

      if (error) throw error;

      const convertedTeams: ExtendedTeam[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        ageGroup: team.age_group,
        seasonStart: team.season_start,
        seasonEnd: team.season_end,
        clubId: team.club_id,
        yearGroupId: team.year_group_id,
        gameFormat: team.game_format as GameFormat,
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
        gameDuration: team.game_duration || 90,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        clubName: team.clubs?.name || 'Independent',
        playerCount: team.players?.[0]?.count || 0,
        isReadOnly: !isUserTeamAdmin(team.id)
      }));

      setAllTeams(convertedTeams);
    } catch (error) {
      console.error('Error loading all teams:', error);
    }
  };

  const loadUserTeams = async () => {
    const convertedTeams: ExtendedTeam[] = teams.map(team => ({
      ...team,
      clubName: getClubName(team.clubId),
      isReadOnly: false // Team managers can edit their teams
    }));

    console.log('User teams loaded:', convertedTeams.length);
    setAllTeams(convertedTeams);
  };

  const loadLinkedTeams = async () => {
    if (!clubs || clubs.length === 0) return;

    try {
      const clubIds = clubs.map(club => club.id);
      const userTeamIds = teams?.map(t => t.id) || [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .in('club_id', clubIds)
        .not('id', 'in', `(${userTeamIds.join(',') || 'null'})`);

      if (error) throw error;
      
      const convertedTeams: Team[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        ageGroup: team.age_group,
        seasonStart: team.season_start,
        seasonEnd: team.season_end,
        clubId: team.club_id,
        yearGroupId: team.year_group_id,
        gameFormat: team.game_format as GameFormat,
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
        gameDuration: team.game_duration || 90,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        isReadOnly: true
      }));

      setLinkedTeams(convertedTeams);
    } catch (error) {
      console.error('Error loading linked teams:', error);
    }
  };

  const isUserTeamAdmin = (teamId: string) => {
    // Check if user is admin/manager of this specific team
    const userTeam = teams.find(t => t.id === teamId);
    if (!userTeam) return false;
    
    // For now, since we don't have userRole on Team interface, check if team exists in user's teams
    // This means user has some role on the team
    return true; // If user has the team, they can manage it
  };

  const getRoleTitle = () => {
    switch (currentView) {
      case 'global_admin':
        return 'Team Management - Global Admin';
      case 'club_admin':
        return 'Team Management - Club Admin';
      case 'team_manager':
        return 'Team Management - My Teams';
      case 'coach':
        return 'Team Management - Coach View';
      case 'parent':
        return 'Team Management - Parent View';
      default:
        return 'Team Management';
    }
  };

  const getRoleDescription = () => {
    switch (currentView) {
      case 'global_admin':
        return `Manage all teams across the platform (${filteredTeams.length} teams)`;
      case 'club_admin':
        return `Manage teams in your clubs (${filteredTeams.length} teams)`;
      case 'team_manager':
        return `Manage your teams (${filteredTeams.length} teams)`;
      case 'coach':
        return `View and manage teams you coach (${filteredTeams.length} teams)`;
      case 'parent':
        return `View teams for your children (${filteredTeams.length} teams)`;
      default:
        return 'Manage your teams and their settings';
    }
  };

  const shouldShowFilters = () => {
    return currentView === 'global_admin' || currentView === 'club_admin';
  };

  const filterTeams = () => {
    let filtered = [...allTeams];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(search) ||
        team.ageGroup.toLowerCase().includes(search) ||
        team.clubName?.toLowerCase().includes(search)
      );
    }

    if (selectedClub !== 'all') {
      if (selectedClub === 'independent') {
        filtered = filtered.filter(team => !team.clubId);
      } else {
        filtered = filtered.filter(team => team.clubId === selectedClub);
      }
    }

    if (selectedAgeGroup !== 'all') {
      filtered = filtered.filter(team => team.ageGroup === selectedAgeGroup);
    }

    setFilteredTeams(filtered);
  };

  const getClubName = (clubId?: string) => {
    if (!clubId) return 'Independent';
    const club = allClubs.find(c => c.id === clubId) || clubs?.find(c => c.id === clubId);
    return club?.name || 'Unknown Club';
  };

  const getUniqueAgeGroups = () => {
    return Array.from(new Set(allTeams.map(team => team.ageGroup))).sort();
  };

  const handleCreateTeam = async (teamData: Partial<Team>) => {
    try {
      const { data, error } = await supabase.from('teams').insert([{
        name: teamData.name,
        age_group: teamData.ageGroup,
        season_start: teamData.seasonStart,
        season_end: teamData.seasonEnd,
        club_id: teamData.clubId || null,
        game_format: teamData.gameFormat,
        subscription_type: teamData.subscriptionType || 'free',
        performance_categories: teamData.performanceCategories || [],
        kit_icons: teamData.kitIcons || { home: '', away: '', training: '', goalkeeper: '' },
        logo_url: teamData.logoUrl,
        manager_name: teamData.managerName,
        manager_email: teamData.managerEmail,
        manager_phone: teamData.managerPhone,
      }]).select().single();

      if (error) throw error;

      if (data) {
        await supabase
          .from('user_teams')
          .insert({
            user_id: user.id,
            team_id: data.id,
            role: 'admin'
          });
      }

      await refreshUserData();
      loadData();
      setIsTeamDialogOpen(false);
      
      toast({
        title: 'Team created',
        description: `${teamData.name} has been created successfully.`,
      });
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error creating team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const TeamCard = ({ team, isLinked = false }: { team: ExtendedTeam; isLinked?: boolean }) => (
    <Card key={team.id} className={`${isLinked ? 'border-dashed opacity-75' : ''} hover:shadow-lg transition-shadow`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {isAdminUser && (
            <Crown className="h-4 w-4 text-yellow-600" />
          )}
          <div className="w-8 h-8 flex items-center justify-center rounded bg-muted overflow-hidden">
            {team.logoUrl ? (
              <img 
                src={team.logoUrl} 
                alt={`${team.name} logo`}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <Users className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {team.name}
              {isLinked && (
                <Badge variant="outline">Linked</Badge>
              )}
              {team.isReadOnly && (
                <Badge variant="secondary">View Only</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {team.ageGroup} • {team.gameFormat}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Club:</span>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="font-medium">{team.clubName}</span>
            </div>
          </div>
          {team.playerCount !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Players:</span>
              <Badge variant="outline">{team.playerCount}</Badge>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Season:</span>
            <span className="font-medium text-xs">
              {new Date(team.seasonStart).toLocaleDateString()} - {new Date(team.seasonEnd).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setSelectedTeam(team);
            setIsStaffModalOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Staff {team.isReadOnly ? '(View)' : ''}
        </Button>
        {!team.isReadOnly && (
          <StaffManagementButton 
            teamId={team.id} 
            teamName={team.name}
          />
        )}
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedTeam(team);
            setIsSettingsModalOpen(true);
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings {team.isReadOnly ? '(View)' : ''}
        </Button>
        {!team.isReadOnly && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setCodeManagementTeamId(team.id);
              setIsCodeManagementModalOpen(true);
            }}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Codes
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (loading) {
    return (
      <SafeDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading teams...</p>
          </div>
        </div>
      </SafeDashboardLayout>
    );
  }

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {currentView === 'global_admin' && <Crown className="h-6 w-6 text-yellow-600" />}
              {getRoleTitle()}
              {currentView === 'global_admin' && <Badge variant="outline">Global Admin</Badge>}
              {currentView === 'club_admin' && <Badge variant="outline">Club Admin</Badge>}
            </h1>
            <p className="text-muted-foreground">
              {getRoleDescription()}
            </p>
          </div>
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedTeam(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Add a new team to your account.
                </DialogDescription>
              </DialogHeader>
              <TeamForm 
                team={null} 
                clubs={allClubs || []}
                onSubmit={handleCreateTeam} 
                onCancel={() => setIsTeamDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        {shouldShowFilters() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search teams by name, age group, or club..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    <SelectItem value="independent">Independent Teams</SelectItem>
                    {allClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Age Groups</SelectItem>
                    {getUniqueAgeGroups().map((ageGroup) => (
                      <SelectItem key={ageGroup} value={ageGroup}>
                        {ageGroup}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">
                {isAdminUser ? 'No Teams Found' : 'No Teams Yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isAdminUser 
                  ? 'No teams match your current filters. Try adjusting your search criteria.'
                  : "You haven't created any teams yet. Get started by adding your first team!"
                }
              </p>
              <Button onClick={() => setIsTeamDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {isAdminUser ? 'Create Team' : 'Add Your First Team'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
            {!isAdminUser && linkedTeams.map((team) => (
              <TeamCard key={`linked-${team.id}`} team={{...team, clubName: getClubName(team.clubId)}} isLinked />
            ))}
          </div>
        )}

        {/* Modals */}
        {selectedTeam && (
          <>
            <TeamSettingsModal
              team={selectedTeam}
              isOpen={isSettingsModalOpen}
              onClose={() => {
                setIsSettingsModalOpen(false);
                setSelectedTeam(null);
              }}
              onUpdate={async () => {
                await refreshUserData();
                loadData();
              }}
            />
            <TeamStaffModal
              team={selectedTeam}
              isOpen={isStaffModalOpen}
              onClose={() => {
                setIsStaffModalOpen(false);
                setSelectedTeam(null);
              }}
              onUpdate={async () => {
                loadData();
              }}
            />
          </>
        )}

        <CodeManagementModal
          teamId={codeManagementTeamId}
          isOpen={isCodeManagementModalOpen}
          onClose={() => setIsCodeManagementModalOpen(false)}
        />
      </div>
    </SafeDashboardLayout>
  );
};

export default TeamManagement;