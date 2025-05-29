
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const ScoreInput: React.FC<ScoreInputProps> = ({ 
  event, 
  onScoreUpdate, 
  onPOTMUpdate 
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [teamScores, setTeamScores] = useState<{ [teamNumber: number]: number }>({});
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [potmSelections, setPotmSelections] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTeamSelections();
    loadExistingScores();
    loadExistingPOTM();
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
      
      // Initialize team scores
      const initialScores: { [teamNumber: number]: number } = {};
      teamData.forEach(team => {
        initialScores[team.teamNumber] = 0;
      });
      setTeamScores(initialScores);
      
    } catch (error) {
      console.error('Error loading team selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScores = () => {
    if (event.scores && typeof event.scores === 'object') {
      const eventScores = event.scores as any;
      
      // Load team-specific scores
      const loadedTeamScores: { [teamNumber: number]: number } = {};
      Object.keys(eventScores).forEach(key => {
        const teamNumber = parseInt(key);
        if (!isNaN(teamNumber)) {
          loadedTeamScores[teamNumber] = eventScores[key] || 0;
        }
      });
      
      // Handle legacy formats
      if ('ourScore' in eventScores && 'opponentScore' in eventScores) {
        if (Object.keys(loadedTeamScores).length === 0) {
          loadedTeamScores[1] = eventScores.ourScore || 0;
        }
        setOpponentScore(eventScores.opponentScore || 0);
      } else if ('home' in eventScores && 'away' in eventScores) {
        if (Object.keys(loadedTeamScores).length === 0) {
          loadedTeamScores[1] = eventScores.home || 0;
        }
        setOpponentScore(eventScores.away || 0);
      }
      
      setTeamScores(loadedTeamScores);
    }
  };

  const loadExistingPOTM = async () => {
    try {
      // Load existing POTM data
      const existingPOTM: Record<number, string> = {};
      
      // Check if there's a player_of_match_id (old single POTM format)
      if (event.player_of_match_id) {
        existingPOTM[1] = event.player_of_match_id;
      }

      // Check for team-specific POTM in scores object
      if (event.scores && typeof event.scores === 'object') {
        const eventData = event.scores as any;
        Object.keys(eventData).forEach(key => {
          if (key.startsWith('potm_team_')) {
            const teamNum = parseInt(key.replace('potm_team_', ''));
            if (!isNaN(teamNum) && eventData[key]) {
              existingPOTM[teamNum] = eventData[key];
            }
          }
        });
      }

      setPotmSelections(existingPOTM);
    } catch (error) {
      console.error('Error loading existing POTM:', error);
    }
  };

  const handleTeamScoreChange = (teamNumber: number, score: number) => {
    setTeamScores(prev => ({
      ...prev,
      [teamNumber]: score
    }));
  };

  const handlePOTMChange = (teamNumber: number, playerId: string) => {
    setPotmSelections(prev => ({
      ...prev,
      [teamNumber]: playerId === 'none' ? '' : playerId
    }));
  };

  const handleSave = async () => {
    try {
      // Prepare scores data
      const scoresData: any = {
        ...teamScores,
        opponentScore: opponentScore
      };
      
      // For backwards compatibility
      if (teamScores[1] !== undefined) {
        scoresData.ourScore = teamScores[1];
        scoresData.home = teamScores[1];
        scoresData.away = opponentScore;
      }
      
      // Add POTM data to scores object
      Object.entries(potmSelections).forEach(([teamNum, playerId]) => {
        if (playerId) {
          scoresData[`potm_team_${teamNum}`] = playerId;
        }
      });

      // Update event with scores
      onScoreUpdate(event.id, scoresData);

      // Update POTM (for backwards compatibility, set the first team's POTM as the main POTM)
      const firstTeamPOTM = potmSelections[1] || Object.values(potmSelections)[0] || null;
      onPOTMUpdate(event.id, { player_of_match_id: firstTeamPOTM });

      toast({
        title: 'Success',
        description: 'Scores and Player of the Match updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save scores',
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
        {/* Score Input Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold text-lg">Final Score</h3>
          
          <div className="grid gap-4">
            {/* Team Scores */}
            {teamSelections.map((team) => (
              <div key={team.teamNumber} className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <Label htmlFor={`team-${team.teamNumber}-score`}>
                    {team.performanceCategoryName} Score
                  </Label>
                  <Input
                    id={`team-${team.teamNumber}-score`}
                    type="number"
                    min="0"
                    value={teamScores[team.teamNumber] || 0}
                    onChange={(e) => handleTeamScoreChange(team.teamNumber, parseInt(e.target.value) || 0)}
                    className="text-center text-lg font-bold"
                  />
                </div>
                
                <div className="text-center text-xl font-bold">
                  vs {opponentName}
                </div>
              </div>
            ))}
            
            {/* Opponent Score */}
            <div className="space-y-2">
              <Label htmlFor="opponentScore">{opponentName} Score</Label>
              <Input
                id="opponentScore"
                type="number"
                min="0"
                value={opponentScore}
                onChange={(e) => setOpponentScore(parseInt(e.target.value) || 0)}
                className="text-center text-lg font-bold"
              />
            </div>
          </div>

          {/* Score Summary */}
          <div className="text-center text-xl font-bold border-t pt-4 space-y-2">
            {teamSelections.map((team) => (
              <div key={team.teamNumber}>
                {team.performanceCategoryName}: {teamScores[team.teamNumber] || 0} - {opponentScore} {opponentName}
              </div>
            ))}
          </div>
        </div>

        {/* Player of the Match Section */}
        {teamSelections.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Player of the Match</h3>
            
            {teamSelections.map((team) => (
              <div key={team.teamNumber} className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor={`potm-${team.teamNumber}`}>
                  {team.performanceCategoryName} - Player of the Match
                </Label>
                <Select
                  value={potmSelections[team.teamNumber] || 'none'}
                  onValueChange={(value) => handlePOTMChange(team.teamNumber, value)}
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
            ))}
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          Save Results
        </Button>
      </CardContent>
    </Card>
  );
};
