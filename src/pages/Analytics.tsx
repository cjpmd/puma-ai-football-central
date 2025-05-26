
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Users, Calendar, TrendingUp, Lock, Crown } from 'lucide-react';

interface PlayerStats {
  name: string;
  totalGames: number;
  totalMinutes: number;
  captainGames: number;
  playerOfTheMatchCount: number;
}

interface TeamAnalytics {
  totalPlayers: number;
  totalEvents: number;
  upcomingEvents: number;
  averageAttendance: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
}

const Analytics = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAnalyticsPlus, setHasAnalyticsPlus] = useState(false);

  useEffect(() => {
    if (teams.length > 0 && selectedTeamId) {
      loadAnalytics();
    }
  }, [teams, selectedTeamId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load basic team analytics
      const { data: playersData } = await supabase
        .from('players')
        .select('name, match_stats')
        .eq('team_id', selectedTeamId)
        .eq('status', 'active');

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, date, scores, end_time')
        .eq('team_id', selectedTeamId);

      if (playersData) {
        const stats: PlayerStats[] = playersData.map(player => ({
          name: player.name,
          totalGames: player.match_stats?.totalGames || 0,
          totalMinutes: player.match_stats?.totalMinutes || 0,
          captainGames: player.match_stats?.captainGames || 0,
          playerOfTheMatchCount: player.match_stats?.playerOfTheMatchCount || 0,
        }));
        setPlayerStats(stats);
      }

      if (eventsData) {
        const totalEvents = eventsData.length;
        const upcomingEvents = eventsData.filter(e => new Date(e.date) > new Date()).length;
        const completedGames = eventsData.filter(e => e.scores && new Date(e.date) <= new Date());
        
        let gamesWon = 0, gamesLost = 0, gamesDrawn = 0;
        
        completedGames.forEach(game => {
          if (game.scores) {
            const scores = game.scores as any;
            if (scores.home > scores.away) gamesWon++;
            else if (scores.home < scores.away) gamesLost++;
            else gamesDrawn++;
          }
        });

        setTeamAnalytics({
          totalPlayers: playersData?.length || 0,
          totalEvents,
          upcomingEvents,
          averageAttendance: 0, // Would need event attendance data
          gamesWon,
          gamesLost,
          gamesDrawn,
        });
      }

      // Check subscription status
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      setHasAnalyticsPlus(selectedTeam?.subscriptionType === 'analytics_plus');
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const topPlayers = playerStats
    .filter(p => p.totalGames > 0)
    .sort((a, b) => b.totalGames - a.totalGames)
    .slice(0, 5);

  const gameResults = teamAnalytics ? [
    { name: 'Won', value: teamAnalytics.gamesWon, color: '#22c55e' },
    { name: 'Lost', value: teamAnalytics.gamesLost, color: '#ef4444' },
    { name: 'Drawn', value: teamAnalytics.gamesDrawn, color: '#eab308' },
  ] : [];

  const handleUpgrade = () => {
    window.open('https://lovable.dev/projects/fb21d593-e7fb-4b5d-9fcf-49682061565e', '_blank');
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-8">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Team and player performance insights
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!hasAnalyticsPlus && (
              <Button onClick={handleUpgrade} className="bg-yellow-500 hover:bg-yellow-600">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Analytics+
              </Button>
            )}
            {teams.length > 1 && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {!hasAnalyticsPlus && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Upgrade to Analytics+ for Advanced Features</h3>
                  <p className="text-yellow-700 text-sm">
                    Get detailed performance analysis, advanced statistics, and player development tracking.
                  </p>
                </div>
                <Button onClick={handleUpgrade} variant="outline" className="ml-auto">
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="players">Player Stats</TabsTrigger>
            <TabsTrigger value="performance" disabled={!hasAnalyticsPlus}>
              Performance Analysis {!hasAnalyticsPlus && <Lock className="ml-1 h-3 w-3" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {teamAnalytics && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teamAnalytics.totalPlayers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teamAnalytics.totalEvents}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{teamAnalytics.upcomingEvents}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Games Played</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {teamAnalytics.gamesWon + teamAnalytics.gamesLost + teamAnalytics.gamesDrawn}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Players by Games</CardTitle>
                  <CardDescription>Most active players this season</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPlayers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalGames" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {gameResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Game Results</CardTitle>
                    <CardDescription>Win/Loss/Draw breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={gameResults}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {gameResults.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Player Statistics</CardTitle>
                <CardDescription>Detailed player performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {playerStats.map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {player.totalGames} games • {player.totalMinutes} minutes
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {player.captainGames > 0 && (
                          <Badge variant="outline">Captain: {player.captainGames}</Badge>
                        )}
                        {player.playerOfTheMatchCount > 0 && (
                          <Badge variant="outline">POTM: {player.playerOfTheMatchCount}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analytics+ Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Upgrade to Analytics+ to access advanced performance analysis features.
                  </p>
                  <Button onClick={handleUpgrade}>
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
