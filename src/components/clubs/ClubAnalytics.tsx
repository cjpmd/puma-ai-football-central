
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, Trophy, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClubAnalyticsProps {
  clubId: string;
  clubName: string;
}

export const ClubAnalytics: React.FC<ClubAnalyticsProps> = ({
  clubId,
  clubName
}) => {
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any>({
    overview: {},
    teamStats: [],
    playerDistribution: [],
    eventStats: [],
    teams: []
  });
  const { toast } = useToast();

  useEffect(() => {
    if (clubId) {
      loadAnalyticsData();
    }
  }, [clubId, selectedTeam, selectedAgeGroup]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('Loading analytics for club:', clubId);

      // Get all teams linked to this club
      const { data: clubTeams, error: clubTeamsError } = await supabase
        .from('club_teams')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            age_group,
            game_format,
            subscription_type
          )
        `)
        .eq('club_id', clubId);

      if (clubTeamsError) throw clubTeamsError;

      if (!clubTeams || clubTeams.length === 0) {
        setAnalyticsData({ overview: {}, teamStats: [], playerDistribution: [], eventStats: [], teams: [] });
        return;
      }

      const teamIds = clubTeams.map(ct => ct.team_id);
      let filteredTeamIds = teamIds;

      // Apply filters
      if (selectedTeam !== 'all') {
        filteredTeamIds = [selectedTeam];
      }
      if (selectedAgeGroup !== 'all') {
        const teamsInAgeGroup = clubTeams
          .filter(ct => ct.teams.age_group === selectedAgeGroup)
          .map(ct => ct.team_id);
        filteredTeamIds = filteredTeamIds.filter(id => teamsInAgeGroup.includes(id));
      }

      // Get players data
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .in('team_id', filteredTeamIds)
        .eq('status', 'active');

      if (playersError) throw playersError;

      // Get events data
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('team_id', filteredTeamIds);

      if (eventsError) throw eventsError;

      // Calculate analytics
      const overview = {
        totalTeams: filteredTeamIds.length,
        totalPlayers: playersData?.length || 0,
        totalEvents: eventsData?.length || 0,
        averagePlayersPerTeam: Math.round((playersData?.length || 0) / (filteredTeamIds.length || 1))
      };

      // Team statistics
      const teamStats = clubTeams
        .filter(ct => filteredTeamIds.includes(ct.team_id))
        .map(ct => {
          const teamPlayers = playersData?.filter(p => p.team_id === ct.team_id) || [];
          const teamEvents = eventsData?.filter(e => e.team_id === ct.team_id) || [];
          
          return {
            name: ct.teams.name,
            ageGroup: ct.teams.age_group,
            players: teamPlayers.length,
            events: teamEvents.length,
            goalkeepers: teamPlayers.filter(p => p.type === 'goalkeeper').length,
            outfield: teamPlayers.filter(p => p.type === 'outfield').length,
            gameFormat: ct.teams.game_format
          };
        });

      // Player distribution by age group
      const ageGroups = clubTeams.reduce((acc, ct) => {
        if (filteredTeamIds.includes(ct.team_id)) {
          const teamPlayers = playersData?.filter(p => p.team_id === ct.team_id) || [];
          acc[ct.teams.age_group] = (acc[ct.teams.age_group] || 0) + teamPlayers.length;
        }
        return acc;
      }, {} as Record<string, number>);

      const playerDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({
        ageGroup,
        count
      }));

      // Event statistics by type
      const eventTypes = eventsData?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const eventStats = Object.entries(eventTypes).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count
      }));

      // Unique teams for filtering
      const teams = clubTeams.map(ct => ({
        id: ct.team_id,
        name: ct.teams.name,
        ageGroup: ct.teams.age_group
      }));

      setAnalyticsData({
        overview,
        teamStats,
        playerDistribution,
        eventStats,
        teams
      });

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const uniqueAgeGroups = Array.from(new Set(analyticsData.teams.map((t: any) => t.ageGroup)));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Club Analytics - {clubName}</CardTitle>
          <CardDescription>
            Comprehensive analytics for all linked teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {analyticsData.teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by age group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Age Groups</SelectItem>
                {uniqueAgeGroups.map((ageGroup) => (
                  <SelectItem key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analyticsData.overview.totalTeams}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analyticsData.overview.totalPlayers}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analyticsData.overview.totalEvents}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Players/Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">{analyticsData.overview.averagePlayersPerTeam}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Team Statistics</CardTitle>
            <CardDescription>Players and events by team</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.teamStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="players" fill="#8884d8" name="Players" />
                <Bar dataKey="events" fill="#82ca9d" name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Player Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Player Distribution</CardTitle>
            <CardDescription>Players by age group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.playerDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ ageGroup, count }) => `${ageGroup}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.playerDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Details */}
      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
          <CardDescription>Detailed breakdown by team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.teamStats.map((team: any, index: number) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{team.name}</h4>
                  <Badge variant="outline">{team.ageGroup}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Players:</span>
                    <div className="font-semibold">{team.players}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Goalkeepers:</span>
                    <div className="font-semibold">{team.goalkeepers}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outfield:</span>
                    <div className="font-semibold">{team.outfield}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Events:</span>
                    <div className="font-semibold">{team.events}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
