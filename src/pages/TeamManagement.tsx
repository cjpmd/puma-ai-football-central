
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, Settings, Users, Shield, Copy, Edit, Trash2, Eye } from 'lucide-react';
import { TeamForm } from '@/components/teams/TeamForm';
import { Team } from '@/types/team';
import { Club } from '@/types/club';

export const TeamManagement = () => {
  const { teams, clubs, refreshUserData } = useAuth();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamForView, setSelectedTeamForView] = useState<string>('');
  const { toast } = useToast();

  // Auto-select team if only one available
  useEffect(() => {
    if (teams.length === 1 && !selectedTeamForView) {
      setSelectedTeamForView(teams[0].id);
    }
  }, [teams, selectedTeamForView]);

  const handleCreateTeam = async (teamData: Partial<Team>) => {
    try {
      console.log('Creating team with data:', teamData);

      const { data, error } = await supabase.from('teams').insert({
        name: teamData.name,
        age_group: teamData.ageGroup,
        season_start: teamData.seasonStart,
        season_end: teamData.seasonEnd,
        club_id: teamData.clubId,
        subscription_type: teamData.subscriptionType || 'free',
        game_format: teamData.gameFormat,
        kit_icons: teamData.kitIcons as any,
        logo_url: teamData.logoUrl,
        performance_categories: teamData.performanceCategories,
        manager_name: teamData.managerName,
        manager_email: teamData.managerEmail,
        manager_phone: teamData.managerPhone,
        kit_designs: teamData.kitDesigns as any,
        name_display_option: teamData.nameDisplayOption
      }).select().single();

      if (error) throw error;

      console.log('Team created successfully:', data);

      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Create a user_teams record for the current user
      const { error: userTeamError } = await supabase
        .from('user_teams')
        .insert({
          user_id: userData.user.id,
          team_id: data.id,
          role: 'manager'
        });

      if (userTeamError) {
        console.error('Error creating user_teams record:', userTeamError);
        throw userTeamError;
      }

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
          club_id: teamData.clubId,
          subscription_type: teamData.subscriptionType,
          game_format: teamData.gameFormat,
          kit_icons: teamData.kitIcons as any,
          logo_url: teamData.logoUrl,
          performance_categories: teamData.performanceCategories,
          manager_name: teamData.managerName,
          manager_email: teamData.managerEmail,
          manager_phone: teamData.managerPhone,
          kit_designs: teamData.kitDesigns as any,
          name_display_option: teamData.nameDisplayOption
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      console.log('Team updated successfully');
      await refreshUserData();
      setIsTeamDialogOpen(false);

      toast({
        title: 'Team updated',
        description: `${teamData.name} has been updated successfully.`,
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

  const handleDeleteTeam = async (teamId: string) => {
    try {
      console.log('Deleting team with ID:', teamId);

      // Delete user_teams records
      const { error: userTeamsError } = await supabase
        .from('user_teams')
        .delete()
        .eq('team_id', teamId);

      if (userTeamsError) {
        console.error('Error deleting user_teams records:', userTeamsError);
        throw userTeamsError;
      }

      // Delete the team itself
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (teamError) {
        console.error('Error deleting team:', teamError);
        throw teamError;
      }

      console.log('Team deleted successfully');
      await refreshUserData();
      setSelectedTeamForView(''); // Clear selected team after deletion

      toast({
        title: 'Team deleted',
        description: 'The team has been deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error deleting team',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditTeamDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDialogOpen(true);
  };

  const TeamCard = ({ team }: { team: Team }) => (
    <Card key={team.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  className="w-7 h-7 object-contain rounded"
                />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {team.name}
                {team.privacySettings?.showScoresToParents && (
                  <Badge variant="secondary" className="text-xs">
                    Scores Visible
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Age Group: {team.ageGroup}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Season:</span>
            <span className="font-medium">
              {team.seasonStart} - {team.seasonEnd}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Game Format:</span>
            <span className="font-medium">{team.gameFormat}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subscription:</span>
            <Badge variant="outline" className="capitalize">
              {team.subscriptionType}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedTeamForView(team.id);
          }}
          className="flex-1"
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
        <Button
          size="sm"
          onClick={() => openEditTeamDialog(team)}
          className="flex-1"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your teams, players, staff, and settings
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
                    : 'Add a new team to manage players, staff, and events.'}
                </DialogDescription>
              </DialogHeader>
              <TeamForm
                team={selectedTeam}
                clubs={clubs}
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
                You haven't created any teams yet. Start by creating your first team to manage players,
                staff, events, and more.
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
            {/* Team Selection */}
            {teams.length > 1 && !selectedTeamForView && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Select a Team</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            )}

            {/* Team Details View */}
            {selectedTeamForView && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTeamForView('')}
                    >
                      ← Back to Teams
                    </Button>
                    <h2 className="text-xl font-semibold">
                      {teams.find(team => team.id === selectedTeamForView)?.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const teamToDuplicate = teams.find(team => team.id === selectedTeamForView);
                        if (teamToDuplicate) {
                          const newTeamData = { ...teamToDuplicate, name: `${teamToDuplicate.name} Copy` };
                          handleCreateTeam(newTeamData);
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const teamToEdit = teams.find(team => team.id === selectedTeamForView);
                        if (teamToEdit) {
                          openEditTeamDialog(teamToEdit);
                        }
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this team?')) {
                          handleDeleteTeam(selectedTeamForView);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Overview</CardTitle>
                      <CardDescription>
                        Basic information about {teams.find(team => team.id === selectedTeamForView)?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Age Group:</strong> {teams.find(team => team.id === selectedTeamForView)?.ageGroup}</p>
                        <p><strong>Game Format:</strong> {teams.find(team => team.id === selectedTeamForView)?.gameFormat}</p>
                        <p><strong>Season:</strong> {teams.find(team => team.id === selectedTeamForView)?.seasonStart} - {teams.find(team => team.id === selectedTeamForView)?.seasonEnd}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Show team cards if no team selected but teams exist */}
            {!selectedTeamForView && teams.length === 1 && (
              <div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamManagement;
