
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamSummary {
  id: string;
  name: string;
  ageGroup: string;
  gameFormat: string;
  playerCount: number;
  staffCount: number;
  upcomingEventsCount: number;
  recentEventTitle?: string;
  recentEventDate?: string;
}

interface ClubTeamsOverviewProps {
  clubId: string;
  clubName: string;
  onViewTeamDetails?: (teamId: string) => void;
}

export const ClubTeamsOverview: React.FC<ClubTeamsOverviewProps> = ({
  clubId,
  clubName,
  onViewTeamDetails
}) => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalPlayers: 0,
    totalStaff: 0,
    totalEvents: 0,
    playersByAgeGroup: {} as Record<string, number>
  });
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadClubTeamsOverview();
    }
  }, [clubId]);

  const loadClubTeamsOverview = async () => {
    try {
      setLoading(true);
      console.log('Loading club teams overview for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(*)
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) {
        console.error('Error fetching club teams:', clubTeamsError);
        throw clubTeamsError;
      }

      if (!clubTeams || clubTeams.length === 0) {
        setTeams([]);
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      const teamsData = clubTeams.map(ct => ct.teams);

      // Get player counts for each team
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('team_id')
        .in('team_id', teamIds)
        .eq('status', 'active');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      // Get staff counts for each team
      const { data: staffData, error: staffError } = await supabase
        .from('team_staff')
        .select('team_id')
        .in('team_id', teamIds);

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        throw staffError;
      }

      // Get upcoming events for each team
      const today = new Date().toISOString().split('T')[0];
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('team_id, title, date')
        .in('team_id', teamIds)
        .gte('date', today)
        .order('date');

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      // Calculate stats for each team
      const teamSummaries: TeamSummary[] = teamsData.map(team => {
        const playerCount = playersData?.filter(p => p.team_id === team.id).length || 0;
        const staffCount = staffData?.filter(s => s.team_id === team.id).length || 0;
        const teamEvents = eventsData?.filter(e => e.team_id === team.id) || [];
        const upcomingEventsCount = teamEvents.length;
        const recentEvent = teamEvents[0];

        return {
          id: team.id,
          name: team.name,
          ageGroup: team.age_group || 'Unknown',
          gameFormat: team.game_format || 'Unknown',
          playerCount,
          staffCount,
          upcomingEventsCount,
          recentEventTitle: recentEvent?.title,
          recentEventDate: recentEvent?.date
        };
      });

      // Calculate total stats
      const totalPlayers = teamSummaries.reduce((sum, team) => sum + team.playerCount, 0);
      const totalStaff = teamSummaries.reduce((sum, team) => sum + team.staffCount, 0);
      const totalEvents = teamSummaries.reduce((sum, team) => sum + team.upcomingEventsCount, 0);
      
      const playersByAgeGroup = teamSummaries.reduce((acc, team) => {
        acc[team.ageGroup] = (acc[team.ageGroup] || 0) + team.playerCount;
        return acc;
      }, {} as Record<string, number>);

      setTeams(teamSummaries);
      setTotalStats({
        totalPlayers,
        totalStaff,
        totalEvents,
        playersByAgeGroup
      });

    } catch (error: any) {
      console.error('Error loading club teams overview:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load club teams overview',
        variant: 'destructive',
      });
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading club overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalPlayers}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Across {teams.length} team{teams.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalStaff}</div>
            <div className="text-xs text-muted-foreground mt-1">
              All coaching staff
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalEvents}</div>
            <div className="text-xs text-muted-foreground mt-1">
              All teams combined
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Age Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(totalStats.playersByAgeGroup).length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Different age groups
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Players by Age Group */}
      {Object.keys(totalStats.playersByAgeGroup).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Players by Age Group</CardTitle>
            <CardDescription>Distribution of players across different age groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {Object.entries(totalStats.playersByAgeGroup).map(([ageGroup, count]) => (
                <div key={ageGroup} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="font-medium">{ageGroup}</span>
                  <Badge variant="secondary">{count} player{count !== 1 ? 's' : ''}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle>Teams Overview</CardTitle>
          <CardDescription>Summary of all teams linked to {clubName}</CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Teams Linked</h3>
              <p className="text-muted-foreground">
                No teams are currently linked to this club.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">{team.name}</h4>
                          <Badge variant="outline">{team.ageGroup}</Badge>
                          <Badge variant="outline">{team.gameFormat}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{team.playerCount} players</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{team.staffCount} staff</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{team.upcomingEventsCount} upcoming</span>
                          </div>
                          {team.recentEventTitle && team.recentEventDate && (
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">
                                {team.recentEventTitle} - {formatDate(team.recentEventDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {onViewTeamDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTeamDetails(team.id)}
                          className="ml-4"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
