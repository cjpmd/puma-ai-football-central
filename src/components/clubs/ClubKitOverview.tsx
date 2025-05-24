import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Users, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PlayerKitOverviewModal } from '../teams/PlayerKitOverviewModal';

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

interface SimpleTeam {
  id: string;
  name: string;
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
  const [teams, setTeams] = useState<SimpleTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<SimpleTeam | null>(null);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubKitData();
    }
  }, [clubId]);

  const loadClubKitData = async () => {
    try {
      setLoading(true);
      console.log('Loading kit data for club:', clubId);

      // First get teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(id, name)
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      if (!clubTeams || clubTeams.length === 0) {
        setKitIssues([]);
        setTeams([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      const teamData: SimpleTeam[] = clubTeams.map(ct => ({
        id: ct.teams.id,
        name: ct.teams.name
      }));

      setTeams(teamData);

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

      // Get all unique player IDs from kit issues
      const allPlayerIds = Array.from(new Set(
        kitIssuesData?.flatMap(issue => {
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

      if (kitIssuesData && playersData) {
        const kitItems: KitIssue[] = kitIssuesData.map(issue => {
          const team = teamData.find(t => t.id === issue.team_id);
          
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
      console.error('Error loading club kit data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club kit data',
        variant: 'destructive',
      });
      setKitIssues([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTeamKitOverview = (team: SimpleTeam) => {
    setSelectedTeam(team);
    setIsOverviewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club kit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Club Kit Management Overview</h3>
          <p className="text-sm text-muted-foreground">
            Kit issues and player size management across all teams in {clubName}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {teams.length} team{teams.length !== 1 ? 's' : ''} • {kitIssues.length} kit issue{kitIssues.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Team Kit Overview Section */}
      {teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Kit Size Overviews
            </CardTitle>
            <CardDescription>
              View detailed kit size information for each team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{team.name}</h4>
                    <p className="text-sm text-muted-foreground">Team kit sizes</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTeamKitOverview(team)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kit Issues History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Kit Issues
          </CardTitle>
          <CardDescription>
            All kit issues across teams linked to this club
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kitIssues.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Kit Issues Found</h3>
              <p className="text-muted-foreground mb-4">
                {teams.length === 0 
                  ? "No teams are linked to this club yet."
                  : "No kit has been issued by teams linked to this club yet."
                }
              </p>
            </div>
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
        </CardContent>
      </Card>

      {/* Player Kit Overview Modal */}
      {selectedTeam && (
        <PlayerKitOverviewModal 
          team={selectedTeam}
          isOpen={isOverviewModalOpen}
          onClose={() => {
            setIsOverviewModalOpen(false);
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
};
