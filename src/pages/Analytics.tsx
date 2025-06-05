import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { Player } from '@/types';
import { Users, Timer, Crown, Trophy, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResultsSummary } from '@/components/analytics/ResultsSummary';

const Analytics = () => {
  const { teams } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');

  // Fetch active players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['active-players', selectedTeamId],
    queryFn: () => selectedTeamId ? playersService.getActivePlayersByTeamId(selectedTeamId) : [],
    enabled: !!selectedTeamId,
  });

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // Calculate team statistics
  const teamStats = {
    totalPlayers: players.length,
    totalGames: players.reduce((sum, player) => sum + (player.matchStats?.totalGames || 0), 0),
    totalMinutes: players.reduce((sum, player) => sum + (player.matchStats?.totalMinutes || 0), 0),
    totalCaptainGames: players.reduce((sum, player) => sum + (player.matchStats?.captainGames || 0), 0),
    totalPOTMCount: players.reduce((sum, player) => sum + (player.matchStats?.playerOfTheMatchCount || 0), 0),
    fullSquadPlayers: players.filter(p => p.subscriptionType === 'full_squad').length,
    trainingOnlyPlayers: players.filter(p => p.subscriptionType === 'training').length,
  };

  // Top performers
  const topMinutesPlayers = [...players]
    .sort((a, b) => (b.matchStats?.totalMinutes || 0) - (a.matchStats?.totalMinutes || 0))
    .slice(0, 5);

  const topGamePlayers = [...players]
    .sort((a, b) => (b.matchStats?.totalGames || 0) - (a.matchStats?.totalGames || 0))
    .slice(0, 5);

  const captainLeaders = [...players]
    .filter(p => (p.matchStats?.captainGames || 0) > 0)
    .sort((a, b) => (b.matchStats?.captainGames || 0) - (a.matchStats?.captainGames || 0))
    .slice(0, 5);

  const potmLeaders = [...players]
    .filter(p => (p.matchStats?.playerOfTheMatchCount || 0) > 0)
    .sort((a, b) => (b.matchStats?.playerOfTheMatchCount || 0) - (a.matchStats?.playerOfTheMatchCount || 0))
    .slice(0, 5);

  if (isLoading) {
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
          {teams.length > 1 && (
            <div className="min-w-[250px]">
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
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

        {/* Results Summary */}
        <ResultsSummary selectedTeamId={selectedTeamId} />

        {/* Team Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total Players
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{teamStats.totalPlayers}</div>
              <div className="text-xs text-muted-foreground">
                {teamStats.fullSquadPlayers} Full Squad, {teamStats.trainingOnlyPlayers} Training Only
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Total Games
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{teamStats.totalGames}</div>
              <div className="text-xs text-muted-foreground">
                Across all players
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Timer className="h-4 w-4" />
                Total Minutes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{teamStats.totalMinutes}</div>
              <div className="text-xs text-muted-foreground">
                Playing time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Crown className="h-4 w-4" />
                Captain Games
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{teamStats.totalCaptainGames}</div>
              <div className="text-xs text-muted-foreground">
                Leadership instances
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Most Minutes Played
              </CardTitle>
              <CardDescription>
                Players with the highest total playing time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Minutes</TableHead>
                    <TableHead>Games</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMinutesPlayers.map((player, index) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.matchStats?.totalMinutes || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.matchStats?.totalGames || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Most Games Played
              </CardTitle>
              <CardDescription>
                Players with the highest number of appearances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Games</TableHead>
                    <TableHead>Minutes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGamePlayers.map((player, index) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.matchStats?.totalGames || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.matchStats?.totalMinutes || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {captainLeaders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Captain Leaders
                </CardTitle>
                <CardDescription>
                  Players who have captained the most games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Captain Games</TableHead>
                      <TableHead>Total Games</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {captainLeaders.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {player.matchStats?.captainGames || 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {player.matchStats?.totalGames || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {potmLeaders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Player of the Match Leaders
                </CardTitle>
                <CardDescription>
                  Players with the most POTM awards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>POTM Awards</TableHead>
                      <TableHead>Total Games</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {potmLeaders.map((player, index) => (
                      <TableRow key={player.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {player.matchStats?.playerOfTheMatchCount || 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {player.matchStats?.totalGames || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Subscription Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Breakdown</CardTitle>
            <CardDescription>
              Distribution of player subscription types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{teamStats.fullSquadPlayers}</div>
                <div className="text-sm text-blue-600">Full Squad Players</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {teamStats.totalPlayers > 0 ? Math.round((teamStats.fullSquadPlayers / teamStats.totalPlayers) * 100) : 0}% of squad
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{teamStats.trainingOnlyPlayers}</div>
                <div className="text-sm text-green-600">Training Only Players</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {teamStats.totalPlayers > 0 ? Math.round((teamStats.trainingOnlyPlayers / teamStats.totalPlayers) * 100) : 0}% of squad
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
