
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Target, Minus } from 'lucide-react';

interface ScoreInputProps {
  event: DatabaseEvent;
  onScoreUpdate: (eventId: string, scores: any) => void;
  onPOTMUpdate: (eventId: string, potmData: any) => void;
}

interface TeamSelection {
  teamNumber: number;
  performanceCategoryName: string;
  players: Array<{ id: string; name: string; squadNumber: number }>;
}

interface TeamResult {
  teamNumber: number;
  teamName: string;
  score: number;
  opponentScore: number;
  potm: string;
  outcome: 'win' | 'draw' | 'loss' | '';
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ 
  event, 
  onScoreUpdate, 
  onPOTMUpdate 
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [teamResults, setTeamResults] = useState<{ [teamNumber: number]: TeamResult }>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTeamSelections();
    loadExistingResults();
  }, [event.id]);

  const loadTeamSelections = async () => {
    try {
      setLoading(true);
      
      // Get team selections with performance categories
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select(`
          team_number,
          performance_category_id,
          player_positions
        `)
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      if (error) throw error;

      const teamData: TeamSelection[] = [];

      for (const selection of selections || []) {
        let performanceCategoryName = `Team ${selection.team_number}`;

        // Get performance category name if set
        if (selection.performance_category_id) {
          const { data: category } = await supabase
            .from('performance_categories')
            .select('name')
            .eq('id', selection.performance_category_id)
            .single();
          
          if (category) {
            performanceCategoryName = category.name;
          }
        }

        // Get players for this team
        const playerIds = (selection.player_positions as any[] || []).map(pp => pp.playerId || pp.player_id);
        const players: Array<{ id: string; name: string; squadNumber: number }> = [];

        if (playerIds.length > 0) {
          const { data: playersData } = await supabase
            .from('players')
            .select('id, name, squad_number')
            .in('id', playerIds);

          if (playersData) {
            players.push(...playersData.map(p => ({
              id: p.id,
              name: p.name,
              squadNumber: p.squad_number
            })));
          }
        }

        teamData.push({
          teamNumber: selection.team_number,
          performanceCategoryName,
          players
        });
      }

      setTeamSelections(teamData.sort((a, b) => a.teamNumber - b.teamNumber));
      
      // Initialize team results
      const initialResults: { [teamNumber: number]: TeamResult } = {};
      teamData.forEach(team => {
        initialResults[team.teamNumber] = {
          teamNumber: team.teamNumber,
          teamName: team.performanceCategoryName,
          score: 0,
          opponentScore: 0,
          potm: '',
          outcome: ''
        };
      });
      setTeamResults(initialResults);
      
    } catch (error) {
      console.error('Error loading team selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResults = () => {
    if (event.scores && typeof event.scores === 'object') {
      const eventScores = event.scores as any;
      
      setTeamResults(prev => {
        const updated = { ...prev };
        
        Object.keys(updated).forEach(teamNumStr => {
          const teamNum = parseInt(teamNumStr);
          const teamKey = `team_${teamNum}`;
          const opponentKey = `opponent_${teamNum}`;
          const potmKey = `potm_team_${teamNum}`;
          
          if (eventScores[teamKey] !== undefined) {
            updated[teamNum].score = eventScores[teamKey] || 0;
          }
          if (eventScores[opponentKey] !== undefined) {
            updated[teamNum].opponentScore = eventScores[opponentKey] || 0;
          }
          if (eventScores[potmKey]) {
            updated[teamNum].potm = eventScores[potmKey];
          }
          
          // Calculate outcome
          const ourScore = updated[teamNum].score;
          const oppScore = updated[teamNum].opponentScore;
          if (ourScore > oppScore) {
            updated[teamNum].outcome = 'win';
          } else if (ourScore < oppScore) {
            updated[teamNum].outcome = 'loss';
          } else if (ourScore === oppScore && (ourScore > 0 || oppScore > 0)) {
            updated[teamNum].outcome = 'draw';
          } else {
            updated[teamNum].outcome = '';
          }
        });
        
        return updated;
      });
    }
  };

  const handleTeamResultChange = (teamNumber: number, field: keyof TeamResult, value: any) => {
    setTeamResults(prev => {
      const updated = { ...prev };
      updated[teamNumber] = { ...updated[teamNumber], [field]: value };
      
      // Auto-calculate outcome when scores change
      if (field === 'score' || field === 'opponentScore') {
        const ourScore = field === 'score' ? value : updated[teamNumber].score;
        const oppScore = field === 'opponentScore' ? value : updated[teamNumber].opponentScore;
        
        if (ourScore > oppScore) {
          updated[teamNumber].outcome = 'win';
        } else if (ourScore < oppScore) {
          updated[teamNumber].outcome = 'loss';
        } else if (ourScore === oppScore && (ourScore > 0 || oppScore > 0)) {
          updated[teamNumber].outcome = 'draw';
        } else {
          updated[teamNumber].outcome = '';
        }
      }
      
      return updated;
    });
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'win': return <Trophy className="h-4 w-4 text-green-500" />;
      case 'draw': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'loss': return <Target className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'win': return <Badge className="bg-green-500">Win</Badge>;
      case 'draw': return <Badge className="bg-yellow-500">Draw</Badge>;
      case 'loss': return <Badge className="bg-red-500">Loss</Badge>;
      default: return null;
    }
  };

  const handleSave = async () => {
    try {
      // Prepare scores data
      const scoresData: any = {};
      
      Object.values(teamResults).forEach(result => {
        scoresData[`team_${result.teamNumber}`] = result.score;
        scoresData[`opponent_${result.teamNumber}`] = result.opponentScore;
        scoresData[`outcome_${result.teamNumber}`] = result.outcome;
        if (result.potm) {
          scoresData[`potm_team_${result.teamNumber}`] = result.potm;
        }
      });
      
      // For backwards compatibility, use first team's data as primary
      const firstTeamResult = Object.values(teamResults)[0];
      if (firstTeamResult) {
        scoresData.ourScore = firstTeamResult.score;
        scoresData.opponentScore = firstTeamResult.opponentScore;
        scoresData.home = firstTeamResult.score;
        scoresData.away = firstTeamResult.opponentScore;
      }

      // Update event with scores
      onScoreUpdate(event.id, scoresData);

      // Update POTM (for backwards compatibility, set the first team's POTM as the main POTM)
      const firstTeamPOTM = firstTeamResult?.potm || null;
      onPOTMUpdate(event.id, { player_of_match_id: firstTeamPOTM });

      toast({
        title: 'Success',
        description: 'Match results saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save match results',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading team data...</div>
        </CardContent>
      </Card>
    );
  }

  if (teamSelections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No team selections found for this event. Please set up team selections first.
          </div>
        </CardContent>
      </Card>
    );
  }

  const opponentName = event.opponent || 'Opponent';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Results for each team */}
        {teamSelections.map((team) => {
          const result = teamResults[team.teamNumber];
          if (!result) return null;
          
          return (
            <div key={team.teamNumber} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {team.performanceCategoryName} vs {opponentName}
                  {getOutcomeIcon(result.outcome)}
                  {getOutcomeBadge(result.outcome)}
                </h3>
              </div>
              
              {/* Score Input */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`team-${team.teamNumber}-score`}>
                    {team.performanceCategoryName} Score
                  </Label>
                  <Input
                    id={`team-${team.teamNumber}-score`}
                    type="number"
                    min="0"
                    value={result.score}
                    onChange={(e) => handleTeamResultChange(team.teamNumber, 'score', parseInt(e.target.value) || 0)}
                    className="text-center text-lg font-bold"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`opponent-${team.teamNumber}-score`}>
                    {opponentName} Score
                  </Label>
                  <Input
                    id={`opponent-${team.teamNumber}-score`}
                    type="number"
                    min="0"
                    value={result.opponentScore}
                    onChange={(e) => handleTeamResultChange(team.teamNumber, 'opponentScore', parseInt(e.target.value) || 0)}
                    className="text-center text-lg font-bold"
                  />
                </div>
              </div>

              {/* Score Display */}
              <div className="text-center text-xl font-bold border-t pt-4">
                {team.performanceCategoryName}: {result.score} - {result.opponentScore} {opponentName}
              </div>

              {/* Player of the Match */}
              <div className="space-y-2">
                <Label htmlFor={`potm-${team.teamNumber}`}>
                  Player of the Match - {team.performanceCategoryName}
                </Label>
                <Select
                  value={result.potm || 'none'}
                  onValueChange={(value) => handleTeamResultChange(team.teamNumber, 'potm', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select POTM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No POTM</SelectItem>
                    {team.players
                      .sort((a, b) => a.squadNumber - b.squadNumber)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (#{player.squadNumber})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}

        <Button onClick={handleSave} className="w-full">
          Save All Results
        </Button>
      </CardContent>
    </Card>
  );
};
