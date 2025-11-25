
import { useState, useEffect } from 'react';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useClubContext } from '@/contexts/ClubContext';
import { Users, BookOpen } from 'lucide-react';
import { PlayerManagement } from '@/components/players/PlayerManagement';
import { IndividualTrainingDashboard } from '@/components/individual-training/IndividualTrainingDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team } from '@/types';

const PlayerManagementPage = () => {
  const { user, connectedPlayers } = useAuth();
  const { filteredTeams: teams } = useClubContext();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Update selectedTeamId when teams load
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  // Convert connected players to the format expected by the dashboard
  const userPlayers = connectedPlayers?.map(cp => ({
    id: cp.id,
    name: cp.name,
    team_id: cp.team?.id || ''
  })) || [];

  return (
    <SafeDashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Player Management</h1>
            <p className="text-muted-foreground">
              Manage your squad and player information
            </p>
          </div>

          {teams.length > 1 && (
            <div className="min-w-[250px]">
              <Select value={selectedTeamId} onValueChange={handleTeamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Teams Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                You need to create a team first before you can manage players.
              </p>
              <Button
                onClick={() => window.location.href = '/teams'}
                className="bg-puma-blue-500 hover:bg-puma-blue-600"
              >
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : selectedTeam ? (
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="players" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Players
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Training Plans
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="players" className="mt-6">
              <PlayerManagement team={selectedTeam} />
            </TabsContent>
            
            <TabsContent value="training" className="mt-6">
              <IndividualTrainingDashboard 
                userId={user?.id || ''} 
                userPlayers={userPlayers.filter(p => p.team_id === selectedTeamId)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            Please select a team to manage players.
          </div>
        )}
      </div>
    </SafeDashboardLayout>
  );
};

export default PlayerManagementPage;
