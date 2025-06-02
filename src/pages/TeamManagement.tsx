import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TeamForm } from '@/components/teams/TeamForm';
import { TeamSettingsModal } from '@/components/teams/TeamSettingsModal';
import { TeamStaffModal } from '@/components/teams/TeamStaffModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Team, Club, SubscriptionType, GameFormat } from '@/types/index';
import { PlusCircle, Settings, UserPlus, Users } from 'lucide-react';

const TeamManagement = () => {
  const { teams, clubs, refreshUserData } = useAuth();
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [linkedTeams, setLinkedTeams] = useState<Team[]>([]);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAllClubs();
    loadLinkedTeams();
  }, [clubs]);

  const loadAllClubs = async () => {
    try {
      console.log('Loading all clubs...');
      const { data, error } = await supabase.from('clubs').select('*');
      
      if (error) {
        console.error('Error loading clubs:', error);
        return;
      }

      console.log('Loaded clubs:', data);
      
      // Convert database format to Club interface with proper type handling
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
      console.error('Error in loadAllClubs:', error);
    }
  };

  const loadLinkedTeams = async () => {
    if (!clubs || clubs.length === 0) return;

    try {
      console.log('Loading linked teams for clubs...');
      const clubIds = clubs.map(club => club.id);
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .in('club_id', clubIds)
        .not('id', 'in', `(${teams?.map(t => t.id).join(',') || ''})`);

      if (error) {
        console.error('Error loading linked teams:', error);
        return;
      }

      console.log('Loaded linked teams raw:', data);
      
      // Convert database format to Team interface with proper type handling
      const convertedTeams: Team[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        ageGroup: team.age_group,
        seasonStart: team.season_start,
        seasonEnd: team.season_end,
        clubId: team.club_id,
        gameFormat: team.game_format as GameFormat,
        subscriptionType: (team.subscription_type as SubscriptionType) || 'free',
        performanceCategories: team.performance_categories || [],
        kitIcons: typeof team.kit_icons === 'object' && team.kit_icons !== null ? 
          team.kit_icons as { home: string; away: string; training: string; goalkeeper: string; } : 
          { home: '', away: '', training: '', goalkeeper: '' },
        logoUrl: team.logo_url,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        isReadOnly: true
      }));

      console.log('Converted linked teams:', convertedTeams);
      setLinkedTeams(convertedTeams);
    } catch (error) {
      console.error('Error in loadLinkedTeams:', error);
    }
  };

  const handleCreateTeam = async (teamData: Partial<Team>) => {
    try {
      console.log('Creating team with data:', teamData);
      
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
        logo_url: teamData.logoUrl
      }]).select().single();

      if (error) throw error;

      // If linking to a club, add to club_teams table
      if (teamData.clubId && data) {
        const { error: linkError } = await supabase
          .from('club_teams')
          .insert({ club_id: teamData.clubId, team_id: data.id });

        if (linkError && !linkError.message.includes('duplicate')) {
          console.error('Error linking team to club:', linkError);
        }
      }

      console.log('Team created successfully:', data);
      await refreshUserData();
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

  const handleUpdateTeam = async (teamData: Partial<Team>) => {
    if (!selectedTeam?.id) return;

    try {
      console.log('Updating team with data:', teamData);
      
      const { error } = await supabase
        .from('teams')
        .update({
          name: teamData.name,
          age_group: teamData.ageGroup,
          season_start: teamData.seasonStart,
          season_end: teamData.seasonEnd,
          club_id: teamData.clubId || null,
          game_format: teamData.gameFormat,
          subscription_type: teamData.subscriptionType,
          performance_categories: teamData.performanceCategories,
          kit_icons: teamData.kitIcons,
          logo_url: teamData.logoUrl
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      // Handle club linking/unlinking
      if (teamData.hasOwnProperty('clubId')) {
        // Remove existing club link
        await supabase
          .from('club_teams')
          .delete()
          .eq('team_id', selectedTeam.id);

        // Add new club link if specified
        if (teamData.clubId) {
          const { error: linkError } = await supabase
            .from('club_teams')
            .insert({ club_id: teamData.clubId, team_id: selectedTeam.id });

          if (linkError && !linkError.message.includes('duplicate')) {
            console.error('Error linking team to club:', linkError);
          }
        }
      }

      console.log('Team updated successfully');
      await refreshUserData();
      await loadLinkedTeams(); // Reload linked teams to show updated data
      setIsTeamDialogOpen(false);
      setIsSettingsModalOpen(false);
      setIsStaffModalOpen(false);
      
      toast({
        title: 'Team updated',
        description: `${teamData.name || selectedTeam.name} has been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast({
        title: 'Error updating team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openTeamSettingsModal = (team: Team, isReadOnly = false) => {
    console.log('Opening settings for team:', team, 'Read only:', isReadOnly);
    const teamWithReadOnly: Team = { ...team, isReadOnly };
    setSelectedTeam(teamWithReadOnly);
    setIsSettingsModalOpen(true);
  };

  const openStaffModal = (team: Team, isReadOnly = false) => {
    console.log('Opening staff modal for team:', team, 'Read only:', isReadOnly);
    const teamWithReadOnly: Team = { ...team, isReadOnly };
    setSelectedTeam(teamWithReadOnly);
    setIsStaffModalOpen(true);
  };

  const openEditTeamDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
  };

  const getClubName = (clubId?: string) => {
    console.log('Getting club name for ID:', clubId, 'Available clubs:', allClubs);
    if (!clubId) return 'Independent';
    const club = allClubs.find(c => c.id === clubId);
    console.log('Found club:', club);
    return club?.name || 'Unknown Club';
  };

  const TeamCard = ({ team, isLinked = false }: { team: Team; isLinked?: boolean }) => (
    <Card key={team.id} className={isLinked ? 'border-dashed opacity-75' : ''}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
            {team.logoUrl ? (
              <img 
                src={team.logoUrl} 
                alt={`${team.name} logo`}
                className="w-7 h-7 object-contain rounded"
              />
            ) : (
              <Users className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {team.name}
              {isLinked && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Linked
                </span>
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
            <span className="text-muted-foreground">Season:</span>
            <span className="font-medium">
              {new Date(team.seasonStart).toLocaleDateString()} - {new Date(team.seasonEnd).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Club:</span>
            <span className="font-medium">
              {getClubName(team.clubId)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subscription:</span>
            <span className="font-medium capitalize">
              {team.subscriptionType}
            </span>
          </div>
          {team.performanceCategories && team.performanceCategories.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Categories:</span>
              <span className="font-medium">
                {team.performanceCategories.length}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => openStaffModal(team, isLinked)}
          className={isLinked ? 'opacity-75' : ''}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Staff {isLinked ? '(View)' : ''}
        </Button>
        <Button 
          size="sm" 
          onClick={() => openTeamSettingsModal(team, isLinked)}
          className={isLinked ? 'opacity-75' : ''}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings {isLinked ? '(View)' : ''}
        </Button>
      </CardFooter>
    </Card>
  );

  console.log('TeamManagement render - teams:', teams, 'clubs:', clubs, 'allClubs:', allClubs, 'linkedTeams:', linkedTeams);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your teams and their settings
            </p>
          </div>
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setSelectedTeam(null)} 
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedTeam && !selectedTeam.isReadOnly ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogDescription>
                  {selectedTeam && !selectedTeam.isReadOnly
                    ? 'Update your team details and settings.' 
                    : 'Add a new team to your account.'}
                </DialogDescription>
              </DialogHeader>
              <TeamForm 
                team={selectedTeam && !selectedTeam.isReadOnly ? selectedTeam : null} 
                clubs={allClubs || []}
                onSubmit={selectedTeam && !selectedTeam.isReadOnly ? handleUpdateTeam : handleCreateTeam} 
                onCancel={() => setIsTeamDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 && linkedTeams.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You haven't created any teams yet. Start by creating your first team to manage players, events, and more.
              </p>
              <Button 
                onClick={() => setIsTeamDialogOpen(true)}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Managed Teams */}
            {teams.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Your Teams</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            )}

            {/* Linked Teams */}
            {linkedTeams.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Linked Teams</h2>
                <p className="text-muted-foreground mb-4">
                  Teams linked through your club memberships (read-only access)
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {linkedTeams.map((team) => (
                    <TeamCard key={team.id} team={team} isLinked={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTeam && (
        <>
          <TeamSettingsModal 
            team={selectedTeam}
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onUpdate={handleUpdateTeam}
          />
          <TeamStaffModal
            team={selectedTeam}
            isOpen={isStaffModalOpen}
            onClose={() => setIsStaffModalOpen(false)}
            onUpdate={handleUpdateTeam}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default TeamManagement;
