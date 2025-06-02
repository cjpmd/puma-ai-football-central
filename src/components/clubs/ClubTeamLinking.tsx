
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link, Unlink } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  age_group: string;
  club_id: string | null;
}

interface ClubTeamLinkingProps {
  clubId: string;
  clubName: string;
  onTeamLinked?: () => void;
}

export const ClubTeamLinking: React.FC<ClubTeamLinkingProps> = ({
  clubId,
  clubName,
  onTeamLinked
}) => {
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [linkedTeams, setLinkedTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTeams();
  }, [clubId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      
      // Load all teams
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, age_group, club_id');

      if (teamsError) throw teamsError;

      // Load existing club-team relationships
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select('team_id')
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      const linkedTeamIds = clubTeams?.map(ct => ct.team_id) || [];
      
      // Separate linked and available teams
      const linked = allTeams?.filter(team => linkedTeamIds.includes(team.id)) || [];
      const available = allTeams?.filter(team => !linkedTeamIds.includes(team.id) && !team.club_id) || [];

      setLinkedTeams(linked);
      setAvailableTeams(available);
    } catch (error: any) {
      console.error('Error loading teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const linkTeam = async () => {
    if (!selectedTeamId) return;

    try {
      // Add to club_teams table
      const { error: linkError } = await supabase
        .from('club_teams')
        .insert({ club_id: clubId, team_id: selectedTeamId });

      if (linkError) throw linkError;

      // Update team's club_id
      const { error: updateError } = await supabase
        .from('teams')
        .update({ club_id: clubId })
        .eq('id', selectedTeamId);

      if (updateError) throw updateError;

      toast({
        title: 'Team Linked',
        description: 'Team has been successfully linked to the club',
      });

      setSelectedTeamId('');
      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error linking team:', error);
      toast({
        title: 'Error',
        description: 'Failed to link team to club',
        variant: 'destructive',
      });
    }
  };

  const unlinkTeam = async (teamId: string) => {
    try {
      // Remove from club_teams table
      const { error: unlinkError } = await supabase
        .from('club_teams')
        .delete()
        .eq('club_id', clubId)
        .eq('team_id', teamId);

      if (unlinkError) throw unlinkError;

      // Clear team's club_id
      const { error: updateError } = await supabase
        .from('teams')
        .update({ club_id: null })
        .eq('id', teamId);

      if (updateError) throw updateError;

      toast({
        title: 'Team Unlinked',
        description: 'Team has been unlinked from the club',
      });

      loadTeams();
      onTeamLinked?.();
    } catch (error: any) {
      console.error('Error unlinking team:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlink team from club',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading team linking...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Link New Team */}
      <Card>
        <CardHeader>
          <CardTitle>Link Team to {clubName}</CardTitle>
          <CardDescription>Connect independent teams to this club</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a team to link" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.age_group})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={linkTeam} disabled={!selectedTeamId}>
              <Link className="mr-2 h-4 w-4" />
              Link Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Linked Teams */}
      {linkedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Teams</CardTitle>
            <CardDescription>Teams currently linked to {clubName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{team.name}</span>
                    <span className="text-muted-foreground ml-2">({team.age_group})</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => unlinkTeam(team.id)}
                  >
                    <Unlink className="mr-2 h-4 w-4" />
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
