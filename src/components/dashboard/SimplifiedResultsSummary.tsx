
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface SimplifiedResultsSummaryProps {
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

export const SimplifiedResultsSummary: React.FC<SimplifiedResultsSummaryProps> = ({ selectedTeamId }) => {
  const [results, setResults] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState<string>('Team 1');

  useEffect(() => {
    if (selectedTeamId) {
      loadResults();
    }
  }, [selectedTeamId]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Fetch team name
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', selectedTeamId)
        .single();
      
      if (teamData?.name) {
        setTeamName(teamData.name);
      }

      // Get events with scores for the selected team
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, date, title, opponent, event_type, scores')
        .eq('team_id', selectedTeamId)
        .not('scores', 'is', null)
        .order('date', { ascending: false })
        .limit(10);

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
          const ourScore = scoresData[`team_${teamNumber}`];
          const opponentScore = scoresData[`opponent_${teamNumber}`];
          const outcome = scoresData[`outcome_${teamNumber}`];
          const teamName = eventCategories[teamNumber.toString()] || `Team ${teamNumber}`;
          
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
          
          const displayTeamName = eventCategories['1'] || teamName;
          
          teams.push({
            teamNumber: 1,
            teamName: displayTeamName,
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
          eventType: event.event_type,
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

  const getEventTypeBadgeColor = (eventType: string) => {
    switch (eventType) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading results...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Recent Results
        </CardTitle>
        <CardDescription>
          Latest match results and outcomes
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent results available.</p>
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
              {results.map((result) => (
                result.teams.map((team, teamIndex) => (
                  <TableRow key={`${result.id}-${team.teamNumber}`}>
                    {teamIndex === 0 && (
                      <>
                        <TableCell rowSpan={result.teams.length} className="border-r">
                          <div className="font-medium">
                            {format(new Date(result.date), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell rowSpan={result.teams.length} className="border-r">
                          <div className="font-medium">{result.title}</div>
                        </TableCell>
                        <TableCell rowSpan={result.teams.length} className="border-r">
                          <Badge className={`text-white text-xs ${getEventTypeBadgeColor(result.eventType)}`}>
                            {result.eventType}
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
  );
};
