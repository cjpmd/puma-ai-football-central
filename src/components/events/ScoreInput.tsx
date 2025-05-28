
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
  const [scores, setScores] = useState<Record<number, number>>({});
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
    } catch (error) {
      console.error('Error loading team selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingScores = () => {
    if (event.scores && typeof event.scores === 'object') {
      const eventScores = event.scores as any;
      const newScores: Record<number, number> = {};
      
      // Handle both old format (home/away) and new format (team numbers)
      if ('home' in eventScores && 'away' in eventScores) {
        newScores[1] = eventScores.home || 0;
        newScores[2] = eventScores.away || 0;
      } else {
        // New format with team numbers
        Object.keys(eventScores).forEach(key => {
          const teamNum = parseInt(key);
          if (!isNaN(teamNum)) {
            newScores[teamNum] = eventScores[key] || 0;
          }
        });
      }
      
      setScores(newScores);
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

  const handleScoreChange = (teamNumber: number, score: string) => {
    setScores(prev => ({
      ...prev,
      [teamNumber]: parseInt(score) || 0
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
      const scoresData = { ...scores };
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {teamSelections.map((team) => (
          <div key={team.teamNumber} className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">{team.performanceCategoryName}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`score-${team.teamNumber}`}>Score</Label>
                <Input
                  id={`score-${team.teamNumber}`}
                  type="number"
                  min="0"
                  value={scores[team.teamNumber] || 0}
                  onChange={(e) => handleScoreChange(team.teamNumber, e.target.value)}
                  className="text-center text-lg font-bold"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor={`potm-${team.teamNumber}`}>Player of the Match</Label>
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
            </div>
          </div>
        ))}

        <Button onClick={handleSave} className="w-full">
          Save Results
        </Button>
      </CardContent>
    </Card>
  );
};
