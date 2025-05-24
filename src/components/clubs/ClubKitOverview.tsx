
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface KitIssue {
  id: string;
  kit_item_name: string;
  kit_size?: string;
  quantity: number;
  date_issued: string;
  player_ids: string[];
  teamName: string;
  teamId: string;
  playerNames: string[];
}

interface ClubKitOverviewProps {
  clubId: string;
  clubName: string;
}

export const ClubKitOverview: React.FC<ClubKitOverviewProps> = ({
  clubId,
  clubName
}) => {
  const [kitIssues, setKitIssues] = useState<KitIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubKitIssues();
    }
  }, [clubId]);

  const loadClubKitIssues = async () => {
    try {
      setLoading(true);
      console.log('Loading kit issues for club:', clubId);

      // First get teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select('team_id')
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      if (!clubTeams || clubTeams.length === 0) {
        setKitIssues([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);

      // Get kit issues for these teams
      const { data: kitIssuesData, error: kitIssuesError } = await supabase
        .from('team_kit_issues')
        .select('*')
        .in('team_id', teamIds)
        .order('date_issued', { ascending: false });

      if (kitIssuesError) {
        console.error('Error fetching kit issues:', kitIssuesError);
        throw kitIssuesError;
      }

      // Get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams data:', teamsError);
        throw teamsError;
      }

      // Get all unique player IDs from kit issues
      const allPlayerIds = Array.from(new Set(
        kitIssuesData?.flatMap(issue => {
          // Safely handle the JSON type
          const playerIds = issue.player_ids;
          if (Array.isArray(playerIds)) {
            return playerIds as string[];
          }
          return [];
        }) || []
      ));

      // Get player names
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .in('id', allPlayerIds);

      if (playersError) {
        console.error('Error fetching players data:', playersError);
        throw playersError;
      }

      if (kitIssuesData && teamsData && playersData) {
        const kitItems: KitIssue[] = kitIssuesData.map(issue => {
          const team = teamsData.find(t => t.id === issue.team_id);
          
          // Safely handle player_ids JSON
          const playerIds = Array.isArray(issue.player_ids) ? issue.player_ids as string[] : [];
          const playerNames = playerIds.map(playerId => {
            const player = playersData.find(p => p.id === playerId);
            return player ? `${player.name} (#${player.squad_number})` : 'Unknown Player';
          });

          return {
            id: issue.id,
            kit_item_name: issue.kit_item_name,
            kit_size: issue.kit_size,
            quantity: issue.quantity,
            date_issued: issue.date_issued,
            player_ids: playerIds,
            teamName: team?.name || 'Unknown Team',
            teamId: issue.team_id,
            playerNames,
          };
        });

        setKitIssues(kitItems);
      } else {
        setKitIssues([]);
      }
    } catch (error: any) {
      console.error('Error loading club kit issues:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club kit issues',
        variant: 'destructive',
      });
      setKitIssues([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club kit issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Club Kit Issues Overview</h3>
          <p className="text-sm text-muted-foreground">
            All kit issues across teams linked to {clubName}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {kitIssues.length} kit issue{kitIssues.length !== 1 ? 's' : ''}
        </div>
      </div>

      {kitIssues.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Kit Issues Found</h3>
            <p className="text-muted-foreground mb-4">
              No kit has been issued by teams linked to this club yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {kitIssues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-puma-blue-500" />
                    {issue.kit_item_name}
                  </CardTitle>
                  <div className="flex gap-2">
                    {issue.kit_size && (
                      <Badge variant="outline">Size: {issue.kit_size}</Badge>
                    )}
                    <Badge>Qty: {issue.quantity}</Badge>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{issue.teamName}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Issued on {new Date(issue.date_issued).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Players:</p>
                    <div className="flex flex-wrap gap-1">
                      {issue.playerNames.map((playerName, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {playerName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
