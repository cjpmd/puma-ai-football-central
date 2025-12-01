
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Trophy, Target, Calendar, BarChart3, Shield, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
  possession: number;
  recentResults: any[];
  topPerformers: any[];
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  yellowCards: number;
  redCards: number;
  topScorers: any[];
  topAssisters: any[];
}

export default function AnalyticsMobile() {
  const { filteredTeams } = useClubContext();
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalWins: 0,
    totalDraws: 0,
    totalLosses: 0,
    winRate: 0,
    goalsScored: 0,
    goalsConceded: 0,
    possession: 0,
    recentResults: [],
    topPerformers: [],
    totalGoals: 0,
    totalAssists: 0,
    totalSaves: 0,
    yellowCards: 0,
    redCards: 0,
    topScorers: [],
    topAssisters: []
  });
  const [loading, setLoading] = useState(true);

  // Update selectedTeamId when filteredTeams change (club switch)
  useEffect(() => {
    if (filteredTeams.length > 0) {
      const isCurrentValid = filteredTeams.some(t => t.id === selectedTeamId);
      if (!isCurrentValid) {
        setSelectedTeamId(filteredTeams[0].id);
      }
    } else {
      setSelectedTeamId('');
    }
  }, [filteredTeams]);

  const currentTeam = filteredTeams.find(t => t.id === selectedTeamId);

  useEffect(() => {
    if (currentTeam) {
      loadAnalyticsData();
    }
  }, [currentTeam]);

  const loadAnalyticsData = async () => {
    if (!currentTeam) return;

    try {
      // Load completed events with scores
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .not('scores', 'is', null)
        .lt('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!events) {
        setLoading(false);
        return;
      }

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      // Calculate stats from actual results
      events.forEach(event => {
        const scores = event.scores as any;
        if (!scores) return;

        // Handle different score formats
        let ourScore = 0;
        let opponentScore = 0;

        if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
          ourScore = scores.team_1;
          opponentScore = scores.opponent_1;
        } else if (scores.home !== undefined && scores.away !== undefined) {
          // Determine if we're home or away
          ourScore = event.is_home ? scores.home : scores.away;
          opponentScore = event.is_home ? scores.away : scores.home;
        }

        goalsFor += ourScore;
        goalsAgainst += opponentScore;

        if (ourScore > opponentScore) wins++;
        else if (ourScore < opponentScore) losses++;
        else draws++;
      });

      const totalGames = wins + draws + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      // Load top performers (players with most appearances)
      const { data: playerStats } = await supabase
        .from('event_player_stats')
        .select(`
          player_id,
          players!inner(name),
          event_id,
          minutes_played,
          is_captain
        `)
        .eq('players.team_id', currentTeam.id)
        .gt('minutes_played', 0);

      // Process top performers
      const playerMap = new Map();
      playerStats?.forEach(stat => {
        const playerId = stat.player_id;
        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            name: stat.players.name,
            appearances: 0,
            totalMinutes: 0,
            captainGames: 0
          });
        }
        const player = playerMap.get(playerId);
        player.appearances++;
        player.totalMinutes += stat.minutes_played;
        if (stat.is_captain) player.captainGames++;
      });

      const topPerformers = Array.from(playerMap.values())
        .sort((a, b) => b.appearances - a.appearances)
        .slice(0, 3);

      // Load match events for stats
      const { data: players } = await supabase
        .from('players')
        .select('id, name, match_stats')
        .eq('team_id', currentTeam.id)
        .eq('status', 'active');

      // Calculate match event totals with proper type casting
      const totalGoals = players?.reduce((sum, p) => {
        const stats = p.match_stats as any;
        return sum + (stats?.totalGoals || 0);
      }, 0) || 0;
      
      const totalAssists = players?.reduce((sum, p) => {
        const stats = p.match_stats as any;
        return sum + (stats?.totalAssists || 0);
      }, 0) || 0;
      
      const totalSaves = players?.reduce((sum, p) => {
        const stats = p.match_stats as any;
        return sum + (stats?.totalSaves || 0);
      }, 0) || 0;
      
      const yellowCards = players?.reduce((sum, p) => {
        const stats = p.match_stats as any;
        return sum + (stats?.yellowCards || 0);
      }, 0) || 0;
      
      const redCards = players?.reduce((sum, p) => {
        const stats = p.match_stats as any;
        return sum + (stats?.redCards || 0);
      }, 0) || 0;

      // Top scorers and assisters
      const topScorers = [...(players || [])]
        .filter(p => {
          const stats = p.match_stats as any;
          return (stats?.totalGoals || 0) > 0;
        })
        .sort((a, b) => {
          const aStats = a.match_stats as any;
          const bStats = b.match_stats as any;
          return (bStats?.totalGoals || 0) - (aStats?.totalGoals || 0);
        })
        .slice(0, 3);

      const topAssisters = [...(players || [])]
        .filter(p => {
          const stats = p.match_stats as any;
          return (stats?.totalAssists || 0) > 0;
        })
        .sort((a, b) => {
          const aStats = a.match_stats as any;
          const bStats = b.match_stats as any;
          return (bStats?.totalAssists || 0) - (aStats?.totalAssists || 0);
        })
        .slice(0, 3);

      setAnalytics({
        totalWins: wins,
        totalDraws: draws,
        totalLosses: losses,
        winRate,
        goalsScored: goalsFor,
        goalsConceded: goalsAgainst,
        possession: 0, // This would need to be tracked separately
        recentResults: events.slice(0, 3),
        topPerformers,
        totalGoals,
        totalAssists,
        totalSaves,
        yellowCards,
        redCards,
        topScorers,
        topAssisters
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (event: any) => {
    const scores = event.scores as any;
    if (!scores) return null;

    let ourScore = 0;
    let opponentScore = 0;

    if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
      ourScore = scores.team_1;
      opponentScore = scores.opponent_1;
    } else if (scores.home !== undefined && scores.away !== undefined) {
      ourScore = event.is_home ? scores.home : scores.away;
      opponentScore = event.is_home ? scores.away : scores.home;
    }

    if (ourScore > opponentScore) return { text: 'Win', color: 'bg-green-500' };
    if (ourScore < opponentScore) return { text: 'Loss', color: 'bg-red-500' };
    return { text: 'Draw', color: 'bg-gray-500' };
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{analytics.totalWins}</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{analytics.winRate}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Match Events Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Match Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold">{analytics.totalGoals}</div>
                <div className="text-xs text-muted-foreground">Goals</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold">{analytics.totalAssists}</div>
                <div className="text-xs text-muted-foreground">Assists</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <div className="text-xl font-bold">{analytics.totalSaves}</div>
                <div className="text-xs text-muted-foreground">Saves</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-xl font-bold">{analytics.yellowCards}</div>
                <div className="text-xs text-muted-foreground">Yellow Cards</div>
              </div>
            </div>
            {analytics.redCards > 0 && (
              <div className="mt-3 text-center p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-600" />
                <div className="text-xl font-bold text-red-600">{analytics.redCards}</div>
                <div className="text-xs text-muted-foreground">Red Cards</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goals Scored</span>
                <Badge className="bg-green-500">{analytics.goalsScored}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: analytics.goalsScored > 0 ? `${Math.min((analytics.goalsScored / (analytics.goalsScored + analytics.goalsConceded)) * 100, 100)}%` : '0%' }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goals Conceded</span>
                <Badge variant="destructive">{analytics.goalsConceded}</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: analytics.goalsConceded > 0 ? `${Math.min((analytics.goalsConceded / (analytics.goalsScored + analytics.goalsConceded)) * 100, 100)}%` : '0%' }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recentResults.length > 0 ? (
              analytics.recentResults.map((event) => {
                const result = getResultBadge(event);
                const scores = event.scores as any;
                let scoreDisplay = '';
                
                if (scores) {
                  if (scores.team_1 !== undefined && scores.opponent_1 !== undefined) {
                    scoreDisplay = `${scores.team_1}-${scores.opponent_1}`;
                  } else if (scores.home !== undefined && scores.away !== undefined) {
                    const ourScore = event.is_home ? scores.home : scores.away;
                    const opponentScore = event.is_home ? scores.away : scores.home;
                    scoreDisplay = `${ourScore}-${opponentScore}`;
                  }
                }

                return (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">vs {event.opponent}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-600">{scoreDisplay}</div>
                      {result && (
                        <Badge className={`text-white text-xs ${result.color}`}>
                          {result.text}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent results</p>
            )}
          </CardContent>
        </Card>

        {/* Top Scorers */}
        {analytics.topScorers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Top Scorers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topScorers.map((player, index) => {
                const stats = player.match_stats as any;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {stats?.totalGames || 0} games
                      </div>
                    </div>
                    <Badge className="bg-blue-500">
                      {stats?.totalGoals || 0} goals
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Top Assisters */}
        {analytics.topAssisters.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Top Assisters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topAssisters.map((player, index) => {
                const stats = player.match_stats as any;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {stats?.totalGames || 0} games
                      </div>
                    </div>
                    <Badge className="bg-green-500">
                      {stats?.totalAssists || 0} assists
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Most Appearances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topPerformers.length > 0 ? (
              analytics.topPerformers.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.appearances} appearances
                    </div>
                  </div>
                  <Badge className="bg-purple-500">
                    {Math.round(player.totalMinutes / player.appearances)} min avg
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No performance data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
