
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Settings, UserPlus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TeamForm } from '@/components/teams/TeamForm';
import { TeamSettingsModal } from '@/components/teams/TeamSettingsModal';
import { TeamStaffModal } from '@/components/teams/TeamStaffModal';
import { Team } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TeamManagement = () => {
  const { teams, clubs, refreshUserData } = useAuth();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateTeam = async (teamData: Partial<Team>) => {
    try {
      console.log('Creating team with data:', teamData);
      // Insert team into the database
      const { data: teamResult, error: teamError } = await supabase
        .from('teams')
        .insert([
          {
            name: teamData.name,
            age_group: teamData.ageGroup,
            season_start: teamData.seasonStart,
            season_end: teamData.seasonEnd,
            club_id: teamData.clubId,
            game_format: teamData.gameFormat,
            subscription_type: teamData.subscriptionType || 'free',
            performance_categories: teamData.performanceCategories || [],
            kit_icons: teamData.kitIcons || {
              home: '',
              away: '',
              training: '',
              goalkeeper: ''
            }
          }
        ])
        .select('id')
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);
        throw teamError;
      }

      console.log('Team created successfully:', teamResult);

      // Add the current user as team manager
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Unable to get current user');
      }

      const { error: userTeamError } = await supabase
        .from('user_teams')
        .insert([
          {
            user_id: userData.user.id,
            team_id: teamResult.id,
            role: 'team_manager'
          }
        ]);

      if (userTeamError) {
        console.error('User team assignment error:', userTeamError);
        throw userTeamError;
      }

      await refreshUserData();
      setIsTeamDialogOpen(false);
      toast({
        title: 'Team Created',
        description: `${teamData.name} has been successfully created.`,
      });
    } catch (error: any) {
      console.error('Team creation failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create team',
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
          club_id: teamData.clubId,
          game_format: teamData.gameFormat,
          subscription_type: teamData.subscriptionType,
          performance_categories: teamData.performanceCategories || [],
          kit_icons: teamData.kitIcons || {
            home: '',
            away: '',
            training: '',
            goalkeeper: ''
          }
        })
        .eq('id', selectedTeam.id);

      if (error) {
        console.error('Team update error:', error);
        throw error;
      }

      await refreshUserData();
      setIsTeamDialogOpen(false);
      setSelectedTeam(null);
      toast({
        title: 'Team Updated',
        description: `${teamData.name} has been successfully updated.`,
      });
    } catch (error: any) {
      console.error('Team update failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team',
        variant: 'destructive',
      });
    }
  };

  const openTeamSettingsModal = (team: Team) => {
    console.log('Opening settings for team:', team);
    setSelectedTeam(team);
    setIsSettingsModalOpen(true);
  };

  const openStaffModal = (team: Team) => {
    console.log('Opening staff modal for team:', team);
    setSelectedTeam(team);
    setIsStaffModalOpen(true);
  };

  const openEditTeamDialog = (team: Team) => {
    console.log('Opening edit dialog for team:', team);
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
  };

  const getClubName = (clubId?: string) => {
    console.log('Getting club name for clubId:', clubId, 'Available clubs:', clubs);
    if (!clubId || !clubs || clubs.length === 0) return 'Independent';
    const club = clubs.find(club => club.id === clubId);
    const clubName = club ? club.name : 'Independent';
    console.log('Found club name:', clubName);
    return clubName;
  };

  console.log('TeamManagement render - teams:', teams, 'clubs:', clubs);

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
                  {selectedTeam ? 'Edit Team' : 'Create New Team'}
                </DialogTitle>
                <DialogDescription>
                  {selectedTeam 
                    ? 'Update your team details and settings.' 
                    : 'Add a new team to your account.'}
                </DialogDescription>
              </DialogHeader>
              <TeamForm 
                team={selectedTeam} 
                clubs={clubs || []}
                onSubmit={selectedTeam ? handleUpdateTeam : handleCreateTeam} 
                onCancel={() => setIsTeamDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 ? (
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>
                    {team.ageGroup} • {team.gameFormat}
                  </CardDescription>
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
                  <Button variant="outline" size="sm" onClick={() => openStaffModal(team)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Staff
                  </Button>
                  <Button size="sm" onClick={() => openTeamSettingsModal(team)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </CardFooter>
              </Card>
            ))}
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
