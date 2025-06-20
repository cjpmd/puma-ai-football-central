
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
  }, [event.id]);

  useEffect(() => {
    loadExistingResults();
  }, [event.scores, teamSelections]);

  const loadTeamSelections = async () => {
    try {
      setLoading(true);
      
      // Get unique team selections with performance categories
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select(`
          team_number,
          performance_category_id,
          player_positions,
          performance_categories (
            id,
            name
          )
        `)
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      if (error) throw error;

      // Create unique teams map to avoid duplicates based on performance category
      const uniqueTeamsMap = new Map();
      
      for (const selection of selections || []) {
        // Use performance_category_id as the key for uniqueness
        const teamKey = selection.performance_category_id;
        
        if (teamKey && !uniqueTeamsMap.has(teamKey)) {
          let performanceCategoryName = `Team ${selection.team_number}`;

          // Get performance category name if set
          if (selection.performance_categories) {
            const category = selection.performance_categories as any;
            performanceCategoryName = category.name;
          }

          // Get all players for this performance category across all periods
          const allPlayerIds = new Set<string>();
          selections
            .filter(s => s.performance_category_id === teamKey)
            .forEach(s => {
              const playerPositions = (s.player_positions as any[] || []);
              playerPositions.forEach(pp => {
                const playerId = pp.playerId || pp.player_id;
                if (playerId && typeof playerId === 'string') {
                  allPlayerIds.add(playerId);
                }
              });
            });

          const players: Array<{ id: string; name: string; squadNumber: number }> = [];

          if (allPlayerIds.size > 0) {
            const { data: playersData } = await supabase
              .from('players')
              .select('id, name, squad_number')
              .in('id', Array.from(allPlayerIds));

            if (playersData) {
              players.push(...playersData.map(p => ({
                id: p.id,
                name: p.name,
                squadNumber: p.squad_number
              })));
            }
          }

          uniqueTeamsMap.set(teamKey, {
            teamNumber: selection.team_number,
            performanceCategoryName,
            players
          });
        }
      }

      const teamData = Array.from(uniqueTeamsMap.values()).sort((a, b) => a.teamNumber - b.teamNumber);
      setTeamSelections(teamData);
      
    } catch (error) {
      console.error('Error loading team selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResults = () => {
    if (!teamSelections.length) return;

    // Initialize team results first
    const initialResults: { [teamNumber: number]: TeamResult } = {};
    teamSelections.forEach(team => {
      initialResults[team.teamNumber] = {
        teamNumber: team.teamNumber,
        teamName: team.performanceCategoryName,
        score: 0,
        opponentScore: 0,
        potm: '',
        outcome: ''
      };
    });

    if (event.scores && typeof event.scores === 'object') {
      const eventScores = event.scores as any;
      
      Object.keys(initialResults).forEach(teamNumStr => {
        const teamNum = parseInt(teamNumStr);
        const teamKey = `team_${teamNum}`;
        const opponentKey = `opponent_${teamNum}`;
        const potmKey = `potm_team_${teamNum}`;
        
        if (eventScores[teamKey] !== undefined) {
          initialResults[teamNum].score = eventScores[teamKey] || 0;
        }
        if (eventScores[opponentKey] !== undefined) {
          initialResults[teamNum].opponentScore = eventScores[opponentKey] || 0;
        }
        if (eventScores[potmKey]) {
          initialResults[teamNum].potm = eventScores[potmKey];
        }
        
        // Calculate outcome - Updated to properly handle 0-0 scores
        const ourScore = initialResults[teamNum].score;
        const oppScore = initialResults[teamNum].opponentScore;
        
        if (ourScore > oppScore) {
          initialResults[teamNum].outcome = 'win';
        } else if (ourScore < oppScore) {
          initialResults[teamNum].outcome = 'loss';
        } else if (ourScore === oppScore && (eventScores[teamKey] !== undefined && eventScores[opponentKey] !== undefined)) {
          // Only set as draw if both scores are explicitly set (including 0-0)
          initialResults[teamNum].outcome = 'draw';
        } else {
          initialResults[teamNum].outcome = '';
        }
      });
    }
    
    setTeamResults(initialResults);
  };

  const handleTeamResultChange = (teamNumber: number, field: keyof TeamResult, value: any) => {
    setTeamResults(prev => {
      const updated = { ...prev };
      updated[teamNumber] = { ...updated[teamNumber], [field]: value };
      
      // Auto-calculate outcome when scores change
      if (field === 'score' || field === 'opponentScore') {
        const ourScore = field === 'score' ? value : updated[teamNumber].score;
        const oppScore = field === 'opponentScore' ? value : updated[teamNumber].opponentScore;
        
        // Updated logic to properly handle 0-0 as a draw
        if (ourScore > oppScore) {
          updated[teamNumber].outcome = 'win';
        } else if (ourScore < oppScore) {
          updated[teamNumber].outcome = 'loss';
        } else {
          // Equal scores are always a draw (including 0-0)
          updated[teamNumber].outcome = 'draw';
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

      console.log('Saving scores data:', scoresData);

      // Update event with scores
      await onScoreUpdate(event.id, scoresData);

      // Update POTM (for backwards compatibility, set the first team's POTM as the main POTM)
      const firstTeamPOTM = firstTeamResult?.potm || null;
      await onPOTMUpdate(event.id, { player_of_match_id: firstTeamPOTM });

      toast({
        title: 'Success',
        description: 'Match results saved successfully',
      });

    } catch (error: any) {
      console.error('Error in handleSave:', error);
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
