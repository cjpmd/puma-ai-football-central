
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Calendar, Users, Filter, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ResultsSummaryProps {
  selectedTeamId: string;
}

interface EventResult {
  id: string;
  date: string;
  title: string;
  opponent?: string;
  eventType: string;
  teams: Array<{
    teamNumber: number;
    teamName: string;
    ourScore: number;
    opponentScore: number;
    outcome: 'win' | 'loss' | 'draw';
    outcomeIcon: string;
  }>;
}

interface TeamStats {
  teamName: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  totalGames: number;
}

interface EventTypeStats {
  eventType: string;
  teams: { [teamName: string]: TeamStats };
  totalGames: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ selectedTeamId }) => {
  const [results, setResults] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [eventTypeStats, setEventTypeStats] = useState<{ [eventType: string]: EventTypeStats }>({});

  useEffect(() => {
    if (selectedTeamId) {
      loadResults();
    }
  }, [selectedTeamId]);

  useEffect(() => {
    calculateStats();
  }, [results]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Get events with scores for the selected team
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, date, title, opponent, event_type, scores')
        .eq('team_id', selectedTeamId)
        .not('scores', 'is', null)
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        setResults([]);
        return;
      }

      // Get performance category names for these events
      const eventIds = events.map(event => event.id);
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select(`
          event_id,
          team_number,
          performance_category_id,
          performance_categories!inner(name)
        `)
        .in('event_id', eventIds);

      if (selectionsError) {
        console.error('Error loading performance categories:', selectionsError);
      }

      // Create category map
      const categoryMap: { [eventId: string]: { [teamNumber: string]: string } } = {};
      selections?.forEach(selection => {
        if (!categoryMap[selection.event_id]) {
          categoryMap[selection.event_id] = {};
        }
        const categoryName = (selection.performance_categories as any)?.name;
        if (categoryName) {
          categoryMap[selection.event_id][selection.team_number.toString()] = categoryName;
        }
      });

      // Process events into results
      const processedResults: EventResult[] = events.map(event => {
        const scoresData = event.scores as any;
        const eventCategories = categoryMap[event.id] || {};
        const teams: EventResult['teams'] = [];

        // Process multi-team format
        let teamNumber = 1;
        while (scoresData[`team_${teamNumber}`] !== undefined) {
          const ourScore = scoresData[`team_${teamNumber}`] || 0;
          const opponentScore = scoresData[`opponent_${teamNumber}`] || 0;
          const rawOutcome = scoresData[`outcome_${teamNumber}`];
          const teamName = eventCategories[teamNumber.toString()] || `Team ${teamNumber}`;
          
          // Calculate outcome if not provided or invalid
          let outcome: 'win' | 'loss' | 'draw';
          if (rawOutcome === 'win' || rawOutcome === 'loss' || rawOutcome === 'draw') {
            outcome = rawOutcome;
          } else {
            outcome = ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw';
          }
          
          let outcomeIcon = '';
          if (outcome === 'win') outcomeIcon = '🏆';
          else if (outcome === 'loss') outcomeIcon = '❌';
          else if (outcome === 'draw') outcomeIcon = '🤝';
          
          teams.push({
            teamNumber,
            teamName,
            ourScore,
            opponentScore,
            outcome,
            outcomeIcon
          });
          
          teamNumber++;
        }

        // Process simple home/away format if no multi-team data
        if (teams.length === 0 && scoresData.home !== undefined && scoresData.away !== undefined) {
          const ourScore = scoresData.home;
          const opponentScore = scoresData.away;
          
          let outcomeIcon = '';
          if (ourScore > opponentScore) outcomeIcon = '🏆';
          else if (ourScore < opponentScore) outcomeIcon = '❌';
          else outcomeIcon = '🤝';
          
          const teamName = eventCategories['1'] || 'Team 1';
          
          teams.push({
            teamNumber: 1,
            teamName,
            ourScore,
            opponentScore,
            outcome: ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw',
            outcomeIcon
          });
        }

        return {
          id: event.id,
          date: event.date,
          title: event.title,
          opponent: event.opponent,
          eventType: event.event_type || 'match', // Provide default value
          teams
        };
      }).filter(result => result.teams.length > 0);

      setResults(processedResults);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats: { [eventType: string]: EventTypeStats } = {};

    results.forEach(result => {
      // Ensure eventType is defined and not null
      const eventType = result.eventType || 'match';
      
      if (!stats[eventType]) {
        stats[eventType] = {
          eventType: eventType,
          teams: {},
          totalGames: 0,
          totalWins: 0,
          totalDraws: 0,
          totalLosses: 0,
          totalGoalsFor: 0,
          totalGoalsAgainst: 0
        };
      }

      result.teams.forEach(team => {
        if (!stats[eventType].teams[team.teamName]) {
          stats[eventType].teams[team.teamName] = {
            teamName: team.teamName,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            totalGames: 0
          };
        }

        const teamStats = stats[eventType].teams[team.teamName];
        teamStats.totalGames++;
        teamStats.goalsFor += team.ourScore;
        teamStats.goalsAgainst += team.opponentScore;

        if (team.outcome === 'win') {
          teamStats.wins++;
          stats[eventType].totalWins++;
        } else if (team.outcome === 'loss') {
          teamStats.losses++;
          stats[eventType].totalLosses++;
        } else if (team.outcome === 'draw') {
          teamStats.draws++;
          stats[eventType].totalDraws++;
        }

        stats[eventType].totalGames++;
        stats[eventType].totalGoalsFor += team.ourScore;
        stats[eventType].totalGoalsAgainst += team.opponentScore;
      });
    });

    setEventTypeStats(stats);
  };

  const getEventTypeBadgeColor = (eventType: string) => {
    // Add null check for eventType
    if (!eventType) return 'bg-blue-500';
    
    switch (eventType.toLowerCase()) {
      case 'match': 
      case 'fixture': 
      case 'friendly': 
        return 'bg-red-500';
      case 'tournament': 
        return 'bg-purple-500';
      case 'festival': 
        return 'bg-orange-500';
      default: 
        return 'bg-blue-500';
    }
  };

  const getFilteredResults = () => {
    return results.filter(result => {
      const eventType = result.eventType || 'match';
      const eventTypeMatch = selectedEventType === 'all' || eventType === selectedEventType;
      const teamMatch = selectedTeam === 'all' || result.teams.some(team => team.teamName === selectedTeam);
      return eventTypeMatch && teamMatch;
    });
  };

  const getUniqueEventTypes = () => {
    return Array.from(new Set(results.map(result => result.eventType || 'match').filter(Boolean)));
  };

  const getUniqueTeams = () => {
    const teams = new Set<string>();
    results.forEach(result => {
      result.teams.forEach(team => teams.add(team.teamName));
    });
    return Array.from(teams);
  };

  const calculateSummaryStats = () => {
    const filteredResults = getFilteredResults();
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let totalGames = 0;

    filteredResults.forEach(result => {
      result.teams.forEach(team => {
        if (selectedTeam === 'all' || team.teamName === selectedTeam) {
          totalGames++;
          if (team.outcome === 'win') totalWins++;
          else if (team.outcome === 'loss') totalLosses++;
          else if (team.outcome === 'draw') totalDraws++;
        }
      });
    });

    return { totalWins, totalLosses, totalDraws, totalGames };
  };

  const summaryStats = calculateSummaryStats();
  const filteredResults = getFilteredResults();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Results Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading results...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Event Type</label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Event Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  {getUniqueEventTypes().map(eventType => (
                    <SelectItem key={eventType} value={eventType}>
                      {eventType && eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Team / Performance Category</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {getUniqueTeams().map(team => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistics Summary
          </CardTitle>
          <CardDescription>
            Performance breakdown by event type and team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.values(eventTypeStats).map(eventStat => (
              <div key={eventStat.eventType} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={`text-white text-sm ${getEventTypeBadgeColor(eventStat.eventType)}`}>
                    {(eventStat.eventType || 'MATCH').toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {eventStat.totalGames} games • {eventStat.totalWins}W {eventStat.totalDraws}D {eventStat.totalLosses}L • 
                    {eventStat.totalGoalsFor} goals for, {eventStat.totalGoalsAgainst} against
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(eventStat.teams).map(team => (
                    <div key={team.teamName} className="bg-muted/30 rounded p-3">
                      <div className="font-medium text-sm mb-2">{team.teamName}</div>
                      <div className="text-xs space-y-1">
                        <div>Games: {team.totalGames}</div>
                        <div className="text-green-600">Wins: {team.wins}</div>
                        <div className="text-gray-600">Draws: {team.draws}</div>
                        <div className="text-red-600">Losses: {team.losses}</div>
                        <div>Goals: {team.goalsFor} for, {team.goalsAgainst} against</div>
                        <div>Goal Diff: {team.goalsFor - team.goalsAgainst > 0 ? '+' : ''}{team.goalsFor - team.goalsAgainst}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Results Summary
          </CardTitle>
          <CardDescription>
            {selectedEventType !== 'all' || selectedTeam !== 'all' ? 'Filtered r' : 'R'}esults 
            {selectedEventType !== 'all' && ` for ${selectedEventType} events`}
            {selectedTeam !== 'all' && ` for ${selectedTeam}`}
          </CardDescription>
          
          {summaryStats.totalGames > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summaryStats.totalWins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{summaryStats.totalDraws}</div>
                <div className="text-xs text-muted-foreground">Draws</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summaryStats.totalLosses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summaryStats.totalGames}</div>
                <div className="text-xs text-muted-foreground">Total Games</div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events match the selected filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  result.teams
                    .filter(team => selectedTeam === 'all' || team.teamName === selectedTeam)
                    .map((team, teamIndex) => (
                    <TableRow key={`${result.id}-${team.teamNumber}`}>
                      {teamIndex === 0 && (
                        <>
                          <TableCell rowSpan={selectedTeam === 'all' ? result.teams.length : 1} className="border-r">
                            <div className="font-medium">
                              {format(new Date(result.date), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell rowSpan={selectedTeam === 'all' ? result.teams.length : 1} className="border-r">
                            <div className="font-medium">{result.title}</div>
                          </TableCell>
                          <TableCell rowSpan={selectedTeam === 'all' ? result.teams.length : 1} className="border-r">
                            <Badge className={`text-white text-xs ${getEventTypeBadgeColor(result.eventType)}`}>
                              {(result.eventType || 'match').toUpperCase()}
                            </Badge>
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{team.teamName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold">
                          {team.ourScore} - {team.opponentScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        {result.opponent && (
                          <span className="text-muted-foreground">vs {result.opponent}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{team.outcomeIcon}</span>
                          <Badge 
                            variant={team.outcome === 'win' ? 'default' : team.outcome === 'loss' ? 'destructive' : 'secondary'}
                            className={team.outcome === 'win' ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {team.outcome.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
