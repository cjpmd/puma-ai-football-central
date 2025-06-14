import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';
import { PlayerManagement } from '@/components/players/PlayerManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Team } from '@/types/team';

const PlayerManagementPage = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const selectedTeam = teams.find(team => team.id === selectedTeamId);

  return (
    <DashboardLayout>
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
          <PlayerManagement team={selectedTeam} />
        ) : (
          <div className="text-center py-8">
            Please select a team to manage players.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlayerManagementPage;
