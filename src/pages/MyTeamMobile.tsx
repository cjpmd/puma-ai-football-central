import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Trophy, Target, Calendar, BarChart3, Shield, AlertTriangle, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useToast } from '@/hooks/use-toast';

interface CategoryStats {
  categoryId: string | null;
  categoryName: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  totalGames: number;
}

interface AnalyticsData {
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGames: number;
  winRate: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  avgGoalsPerGame: number;
  recentResults: any[];
  topPerformers: any[];
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  yellowCards: number;
  redCards: number;
  topScorers: any[];
  topAssisters: any[];
  categoryStats: CategoryStats[];
}

export default function MyTeamMobile() {
  const { filteredTeams } = useClubContext();
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalWins: 0,
    totalDraws: 0,
    totalLosses: 0,
    totalGames: 0,
    winRate: 0,
    goalsScored: 0,
    goalsConceded: 0,
    goalDifference: 0,
    avgGoalsPerGame: 0,
    recentResults: [],
    topPerformers: [],
    totalGoals: 0,
    totalAssists: 0,
    totalSaves: 0,
    yellowCards: 0,
    redCards: 0,
    topScorers: [],
    topAssisters: [],
    categoryStats: []
  });
  const [loading, setLoading] = useState(true);

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
      // Build query with season filter if available
      let eventsQuery = supabase
        .from('events')
        .select('*')
        .eq('team_id', currentTeam.id)
        .not('scores', 'is', null)
        .lt('date', new Date().toISOString().split('T')[0]);
      
      // Filter by season if available
      if (currentTeam.season_start) {
        eventsQuery = eventsQuery.gte('date', currentTeam.season_start);
      }
      if (currentTeam.season_end) {
        eventsQuery = eventsQuery.lte('date', currentTeam.season_end);
      }
      
      const { data: events } = await eventsQuery.order('date', { ascending: false });

      if (!events) {
        setLoading(false);
        return;
      }

      // Fetch performance categories for this team's events
      const eventIds = events.map(e => e.id);
      const { data: eventSelections } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          performance_category_id,
          performance_categories(id, name)
        `)
        .in('event_id', eventIds);

      // Build a map of event_id -> category info
      const eventCategoryMap = new Map<string, { categoryId: string | null; categoryName: string; teamNumber: number }[]>();
      eventSelections?.forEach(sel => {
        const existing = eventCategoryMap.get(sel.event_id) || [];
        const cat = sel.performance_categories as any;
        existing.push({
          categoryId: sel.performance_category_id,
          categoryName: cat?.name || 'Team ' + sel.team_number,
          teamNumber: sel.team_number || 1
        });
        eventCategoryMap.set(sel.event_id, existing);
      });

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      // Category stats tracking
      const categoryStatsMap = new Map<string, CategoryStats>();

      events.forEach(event => {
        const scores = event.scores as any;
        if (!scores) return;

        // Get categories for this event
        const categories = eventCategoryMap.get(event.id) || [{ categoryId: null, categoryName: 'Default', teamNumber: 1 }];
        
        // Process each team/category in the event
        const processedTeamNumbers = new Set<number>();
        
        categories.forEach(cat => {
          if (processedTeamNumbers.has(cat.teamNumber)) return;
          processedTeamNumbers.add(cat.teamNumber);
          
          let ourScore = 0;
          let opponentScore = 0;
          
          // Parse scores as integers (FIX: was concatenating strings!)
          const teamKey = `team_${cat.teamNumber}`;
          const opponentKey = `opponent_${cat.teamNumber}`;
          
          if (scores[teamKey] !== undefined && scores[opponentKey] !== undefined) {
            ourScore = parseInt(String(scores[teamKey]), 10) || 0;
            opponentScore = parseInt(String(scores[opponentKey]), 10) || 0;
          } else if (cat.teamNumber === 1 && scores.home !== undefined && scores.away !== undefined) {
            ourScore = parseInt(String(event.is_home ? scores.home : scores.away), 10) || 0;
            opponentScore = parseInt(String(event.is_home ? scores.away : scores.home), 10) || 0;
          }

          goalsFor += ourScore;
          goalsAgainst += opponentScore;

          if (ourScore > opponentScore) wins++;
          else if (ourScore < opponentScore) losses++;
          else draws++;
          
          // Track by category
          const catKey = cat.categoryId || cat.categoryName;
          if (!categoryStatsMap.has(catKey)) {
            categoryStatsMap.set(catKey, {
              categoryId: cat.categoryId,
              categoryName: cat.categoryName,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              totalGames: 0
            });
          }
          const catStats = categoryStatsMap.get(catKey)!;
          catStats.goalsFor += ourScore;
          catStats.goalsAgainst += opponentScore;
          catStats.totalGames++;
          if (ourScore > opponentScore) catStats.wins++;
          else if (ourScore < opponentScore) catStats.losses++;
          else catStats.draws++;
        });
      });

      const totalGames = wins + draws + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      const goalDifference = goalsFor - goalsAgainst;
      const avgGoalsPerGame = totalGames > 0 ? Math.round((goalsFor / totalGames) * 10) / 10 : 0;

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

      const playerMap = new Map();
      playerStats?.forEach(stat => {
        const playerId = stat.player_id;
        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            name: (stat.players as any).name,
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

      const { data: players } = await supabase
        .from('players')
        .select('id, name, match_stats')
        .eq('team_id', currentTeam.id)
        .eq('status', 'active');

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

      // Convert category stats map to array
      const categoryStats = Array.from(categoryStatsMap.values())
        .filter(c => c.totalGames > 0)
        .sort((a, b) => b.totalGames - a.totalGames);

      setAnalytics({
        totalWins: wins,
        totalDraws: draws,
        totalLosses: losses,
        totalGames,
        winRate,
        goalsScored: goalsFor,
        goalsConceded: goalsAgainst,
        goalDifference,
        avgGoalsPerGame,
        recentResults: events.slice(0, 5),
        topPerformers,
        totalGoals,
        totalAssists,
        totalSaves,
        yellowCards,
        redCards,
        topScorers,
        topAssisters,
        categoryStats
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

  const getResultBadge = (event: any, teamNumber: number = 1) => {
    const scores = event.scores as any;
    if (!scores) return null;

    let ourScore = 0;
    let opponentScore = 0;
    
    const teamKey = `team_${teamNumber}`;
    const opponentKey = `opponent_${teamNumber}`;

    if (scores[teamKey] !== undefined && scores[opponentKey] !== undefined) {
      ourScore = parseInt(String(scores[teamKey]), 10) || 0;
      opponentScore = parseInt(String(scores[opponentKey]), 10) || 0;
    } else if (scores.home !== undefined && scores.away !== undefined) {
      ourScore = parseInt(String(event.is_home ? scores.home : scores.away), 10) || 0;
      opponentScore = parseInt(String(event.is_home ? scores.away : scores.home), 10) || 0;
    }

    if (ourScore > opponentScore) return { text: 'Win', color: 'bg-green-500', ourScore, opponentScore };
    if (ourScore < opponentScore) return { text: 'Loss', color: 'bg-destructive', ourScore, opponentScore };
    return { text: 'Draw', color: 'bg-muted-foreground', ourScore, opponentScore };
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Team Analytics</h1>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="touch-manipulation">
            <CardContent className="p-3 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{analytics.totalGames}</div>
              <div className="text-xs text-muted-foreground">Games</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-3 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
              <div className="text-2xl font-bold">{analytics.totalWins}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-3 text-center">
              <Target className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold">{analytics.winRate}%</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </CardContent>
          </Card>
          <Card className="touch-manipulation">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <div className="text-2xl font-bold">{analytics.goalDifference >= 0 ? '+' : ''}{analytics.goalDifference}</div>
              <div className="text-xs text-muted-foreground">Goal Diff</div>
            </CardContent>
          </Card>
        </div>

        {/* W-D-L Record */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Season Record</div>
              <div className="flex gap-2 text-sm">
                <span className="text-green-600 font-semibold">W{analytics.totalWins}</span>
                <span className="text-muted-foreground font-semibold">D{analytics.totalDraws}</span>
                <span className="text-destructive font-semibold">L{analytics.totalLosses}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Avg Goals/Game: {analytics.avgGoalsPerGame}</span>
              <span>Points: {analytics.totalWins * 3 + analytics.totalDraws}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Category Breakdown */}
        {analytics.categoryStats.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                By Performance Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.categoryStats.map((cat, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium mb-2">{cat.categoryName}</div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-2">
                      <span className="text-green-600 font-semibold">W{cat.wins}</span>
                      <span className="text-muted-foreground font-semibold">D{cat.draws}</span>
                      <span className="text-destructive font-semibold">L{cat.losses}</span>
                    </div>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>GF: {cat.goalsFor}</span>
                      <span>GA: {cat.goalsAgainst}</span>
                      <span className={cat.goalsFor - cat.goalsAgainst >= 0 ? 'text-green-600' : 'text-destructive'}>
                        {cat.goalsFor - cat.goalsAgainst >= 0 ? '+' : ''}{cat.goalsFor - cat.goalsAgainst}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold">{analytics.totalGoals}</div>
                <div className="text-xs text-muted-foreground">Goals</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold">{analytics.totalAssists}</div>
                <div className="text-xs text-muted-foreground">Assists</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                <div className="text-xl font-bold">{analytics.totalSaves}</div>
                <div className="text-xs text-muted-foreground">Saves</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
                <div className="text-xl font-bold">{analytics.yellowCards}</div>
                <div className="text-xs text-muted-foreground">Yellow Cards</div>
              </div>
            </div>
            {analytics.redCards > 0 && (
              <div className="mt-3 text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
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
              <div className="w-full bg-muted rounded-full h-2">
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
              <div className="w-full bg-muted rounded-full h-2">
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
                const result = getResultBadge(event, 1);

                return (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">vs {event.opponent || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      {result && (
                        <>
                          <div className="font-bold">{result.ourScore}-{result.opponentScore}</div>
                          <Badge className={`text-white text-xs ${result.color}`}>
                            {result.text}
                          </Badge>
                        </>
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
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
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
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
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
        {analytics.topPerformers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Most Appearances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.topPerformers.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {player.totalMinutes} minutes played
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {player.appearances} games
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
