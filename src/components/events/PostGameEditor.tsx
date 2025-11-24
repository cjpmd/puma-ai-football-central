
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceAnalysisSection } from './PerformanceAnalysisSection';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { matchEventService } from '@/services/matchEventService';
import { Trophy, Target, Shield, Calculator } from 'lucide-react';

interface PostGameEditorProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  start_time: string;
  opponent?: string;
  scores?: any;
  player_of_match_id?: string;
  coach_notes?: string;
  staff_notes?: string;
}

interface Player {
  id: string;
  name: string;
  squadNumber: number;
}

interface TeamSelection {
  teamNumber: number;
  performanceCategoryName: string;
  players: Player[];
}

interface Scores {
  [key: string]: string | any;
  home?: string;
  away?: string;
  performance_analysis?: {
    positives: {
      on_ball: string[];
      off_ball: string[];
    };
    challenges: {
      on_ball: string[];
      off_ball: string[];
    };
  };
}

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

export const PostGameEditor: React.FC<PostGameEditorProps> = ({ eventId, isOpen, onClose }) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [playerOfMatchByTeam, setPlayerOfMatchByTeam] = useState<{[teamNumber: number]: string}>({});
  const [scores, setScores] = useState<Scores>({});
  const [coachNotes, setCoachNotes] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [performanceAnalysis, setPerformanceAnalysis] = useState({
    positives: { on_ball: [], off_ball: [] },
    challenges: { on_ball: [], off_ball: [] }
  });
  const [drillTags, setDrillTags] = useState<DrillTag[]>([]);
  const [matchEventsSummary, setMatchEventsSummary] = useState<any>(null);
  const [calculatingScore, setCalculatingScore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasPermission } = useAuthorization();

  useEffect(() => {
    if (eventId && isOpen) {
      loadEventData();
      loadTeamSelections();
      loadDrillTags();
      loadMatchEventsSummary();
    }
  }, [eventId, isOpen]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      console.log('Loading event data for:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, start_time, opponent, scores, player_of_match_id, coach_notes, staff_notes')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error loading event:', eventError);
        throw eventError;
      }
      
      console.log('Event data loaded:', eventData);
      setEvent(eventData);
      
      // Safely handle the scores data from the database
      const scoresData = eventData?.scores as Scores | null;
      console.log('Scores data:', scoresData);
      setScores(scoresData || {});
      
      // Handle POTM by team
      const potmByTeam: {[teamNumber: number]: string} = {};
      if (scoresData) {
        Object.keys(scoresData).forEach(key => {
          if (key.startsWith('potm_team_')) {
            const teamNumber = parseInt(key.replace('potm_team_', ''));
            potmByTeam[teamNumber] = scoresData[key];
          }
        });
      }
      setPlayerOfMatchByTeam(potmByTeam);
      
      setCoachNotes(eventData?.coach_notes || '');
      setStaffNotes(eventData?.staff_notes || '');
      
      // Load performance analysis from scores
      if (scoresData?.performance_analysis) {
        setPerformanceAnalysis(scoresData.performance_analysis);
      } else {
        setPerformanceAnalysis({
          positives: { on_ball: [], off_ball: [] },
          challenges: { on_ball: [], off_ball: [] }
        });
      }
    } catch (error: any) {
      console.error('Error loading event data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load event data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamSelections = async () => {
    try {
      console.log('Loading team selections for event:', eventId);
      
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
        .eq('event_id', eventId);

      if (error) throw error;

      console.log('Raw selections:', selections);

      // Create unique teams map to avoid duplicates based on performance category
      const uniqueTeamsMap = new Map();
      
      for (const selection of selections || []) {
        // Use performance_category_id as the key for uniqueness
        const teamKey = selection.performance_category_id || `team_${selection.team_number}`;
        
        if (!uniqueTeamsMap.has(teamKey)) {
          let performanceCategoryName = `Team ${selection.team_number}`;

          // Get performance category name if set
          if (selection.performance_categories) {
            const category = selection.performance_categories as any;
            performanceCategoryName = category.name;
          }

          // Get all players for this performance category across all periods
          const allPlayerIds = new Set<string>();
          selections
            .filter(s => (s.performance_category_id || `team_${s.team_number}`) === teamKey)
            .forEach(s => {
              const playerPositions = (s.player_positions as any[] || []);
              playerPositions.forEach(pp => {
                const playerId = pp.playerId || pp.player_id;
                if (playerId && typeof playerId === 'string') {
                  allPlayerIds.add(playerId);
                }
              });
            });

          const players: Player[] = [];

          if (allPlayerIds.size > 0) {
            const { data: playersData } = await supabase
              .from('players')
              .select('id, name, squad_number')
              .in('id', Array.from(allPlayerIds));

            if (playersData) {
              players.push(...playersData.map(p => ({
                id: p.id,
                name: p.name,
                squadNumber: p.squad_number || 0
              })));
            }
          }

          uniqueTeamsMap.set(teamKey, {
            teamNumber: selection.team_number,
            performanceCategoryName,
            players: players.sort((a, b) => a.squadNumber - b.squadNumber)
          });
        }
      }

      const teamData = Array.from(uniqueTeamsMap.values()).sort((a, b) => a.teamNumber - b.teamNumber);
      console.log('Processed team selections:', teamData);
      setTeamSelections(teamData);
      
    } catch (error) {
      console.error('Error loading team selections:', error);
    }
  };

  const loadDrillTags = async () => {
    try {
      const { data: tags, error } = await supabase
        .from('drill_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDrillTags(tags || []);
    } catch (error) {
      console.error('Error loading drill tags:', error);
    }
  };

  const loadMatchEventsSummary = async () => {
    try {
      const summary = await matchEventService.getEventMatchEventsSummary(eventId);
      setMatchEventsSummary(summary);
    } catch (error) {
      console.error('Error loading match events summary:', error);
    }
  };

  const handleCalculateScore = async () => {
    try {
      setCalculatingScore(true);
      const calculatedScore = await matchEventService.calculateEventScore(eventId);
      
      // Only update scores for teams that exist
      const newScores: any = { ...scores };
      if (calculatedScore.team_1 !== undefined) {
        newScores.team_1 = calculatedScore.team_1;
      }
      if (calculatedScore.team_2 !== undefined) {
        newScores.team_2 = calculatedScore.team_2;
      }
      
      setScores(newScores);
      
      const scoreDescription = calculatedScore.team_2 !== undefined 
        ? `${calculatedScore.team_1}-${calculatedScore.team_2}`
        : calculatedScore.team_1 || '0';
      
      toast({
        title: 'Score Calculated',
        description: `Score updated to ${scoreDescription} from match events`,
      });
    } catch (error: any) {
      console.error('Error calculating score:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to calculate score',
        variant: 'destructive',
      });
    } finally {
      setCalculatingScore(false);
    }
  };

  const handleScoreChange = (field: string, value: string) => {
    setScores(prev => ({ ...prev, [field]: value }));
  };

  const handlePOTMChange = (teamNumber: number, playerId: string) => {
    setPlayerOfMatchByTeam(prev => ({
      ...prev,
      [teamNumber]: playerId === 'none' ? '' : playerId
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving scores:', scores);
      console.log('Saving POTM by team:', playerOfMatchByTeam);

      // Try to update player stats before saving
      try {
        const { playerStatsService } = await import('@/services/playerStatsService');
        await playerStatsService.updateEventPlayerStats(eventId);
      } catch (statsError) {
        console.warn('Stats update failed, continuing with save:', statsError);
        // Don't block the save
      }

      // Prepare scores data with POTM for each team and performance analysis
      const updatedScores = { ...scores };
      Object.entries(playerOfMatchByTeam).forEach(([teamNumber, playerId]) => {
        if (playerId) {
          updatedScores[`potm_team_${teamNumber}`] = playerId;
        }
      });
      
      // Add performance analysis to scores
      updatedScores.performance_analysis = performanceAnalysis;

      const { error } = await supabase
        .from('events')
        .update({
          scores: updatedScores,
          player_of_match_id: Object.values(playerOfMatchByTeam).find(id => id) || null, // Use first team's POTM as main POTM for backwards compatibility
          coach_notes: coachNotes,
          staff_notes: staffNotes,
        })
        .eq('id', eventId);

      if (error) {
        console.error('Error saving:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Post-game report saved successfully!',
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving post-game report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save post-game report',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  const opponentName = event.opponent || 'Opponent';

  return (
    <div className="space-y-6">
      {/* Event Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold">{event.title}</h3>
        <p className="text-sm text-gray-600">
          {event.date && format(new Date(event.date), 'PPP')} • {event.start_time}
        </p>
        {event.opponent && (
          <p className="text-sm text-gray-600">vs {event.opponent}</p>
        )}
      </div>

      {/* Match Events Summary Section */}
      {matchEventsSummary && (matchEventsSummary.goals.length > 0 || matchEventsSummary.assists.length > 0 || matchEventsSummary.saves.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Match Events Summary</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateScore}
                disabled={calculatingScore}
                className="flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                {calculatingScore ? 'Calculating...' : 'Calculate Score from Events'}
              </Button>
            </CardTitle>
            <CardDescription>
              Events logged during the match
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {matchEventsSummary.goals && matchEventsSummary.goals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Goals ({matchEventsSummary.goals.reduce((sum: number, g: any) => sum + g.count, 0)})
                  </h4>
                  <div className="space-y-1">
                    {matchEventsSummary.goals.map((g: any) => (
                      <div key={g.playerId} className="text-sm">
                        • {g.playerName} ({g.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchEventsSummary.assists && matchEventsSummary.assists.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Assists ({matchEventsSummary.assists.reduce((sum: number, a: any) => sum + a.count, 0)})
                  </h4>
                  <div className="space-y-1">
                    {matchEventsSummary.assists.map((a: any) => (
                      <div key={a.playerId} className="text-sm">
                        • {a.playerName} ({a.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchEventsSummary.saves && matchEventsSummary.saves.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Saves ({matchEventsSummary.saves.reduce((sum: number, s: any) => sum + s.count, 0)})
                  </h4>
                  <div className="space-y-1">
                    {matchEventsSummary.saves.map((s: any) => (
                      <div key={s.playerId} className="text-sm">
                        • {s.playerName} ({s.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show team results if we have actual team selections */}
      {teamSelections.length > 0 ? (
        <div>
          <Label className="text-base font-semibold">Match Results</Label>
          
          <div className="space-y-4 mt-3">
            {teamSelections.map((team) => (
              <div key={team.teamNumber} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">{team.performanceCategoryName} vs {opponentName}</h4>
                
                {/* Score Input */}
                <div className="grid grid-cols-3 gap-4 items-center mb-4">
                  <div className="text-center">
                    <Label className="text-sm text-gray-600">{team.performanceCategoryName}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`team_${team.teamNumber}`] || ''}
                      onChange={(e) => handleScoreChange(`team_${team.teamNumber}`, e.target.value)}
                      className="text-center text-lg font-bold h-12 mt-1"
                    />
                  </div>
                  <div className="text-center text-gray-400 text-lg font-bold">
                    vs
                  </div>
                  <div className="text-center">
                    <Label className="text-sm text-gray-600">{opponentName}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`opponent_${team.teamNumber}`] || ''}
                      onChange={(e) => handleScoreChange(`opponent_${team.teamNumber}`, e.target.value)}
                      className="text-center text-lg font-bold h-12 mt-1"
                    />
                  </div>
                </div>
                
                {/* Outcome indicator */}
                {scores[`team_${team.teamNumber}`] !== undefined && scores[`opponent_${team.teamNumber}`] !== undefined && (
                  <div className="text-center mb-4">
                    <Badge 
                      variant={
                        Number(scores[`team_${team.teamNumber}`]) > Number(scores[`opponent_${team.teamNumber}`]) 
                          ? 'default' 
                          : Number(scores[`team_${team.teamNumber}`]) < Number(scores[`opponent_${team.teamNumber}`])
                          ? 'destructive' 
                          : 'secondary'
                      }
                    >
                      {Number(scores[`team_${team.teamNumber}`]) > Number(scores[`opponent_${team.teamNumber}`]) 
                        ? 'WIN' 
                        : Number(scores[`team_${team.teamNumber}`]) < Number(scores[`opponent_${team.teamNumber}`])
                        ? 'LOSS' 
                        : 'DRAW'
                      }
                    </Badge>
                  </div>
                )}

                {/* Player of the Match for this team */}
                {team.players.length > 0 && (
                  <div>
                    <Label>Player of the Match - {team.performanceCategoryName}</Label>
                    <Select 
                      value={playerOfMatchByTeam[team.teamNumber] || 'none'} 
                      onValueChange={(value) => handlePOTMChange(team.teamNumber, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player of the match" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {team.players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name} (#{player.squadNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No team selections found for this event. Please set up team selections to enter match results.
        </div>
      )}

      {/* Performance Analysis - Only visible to coaches */}
      {teamSelections.length > 0 && hasPermission({ resource: 'events', action: 'manage' }) && (
        <PerformanceAnalysisSection
          analysis={performanceAnalysis}
          onAnalysisChange={setPerformanceAnalysis}
          tags={drillTags}
        />
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="coachNotes">Coach Notes</Label>
        <Textarea
          id="coachNotes"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Add any notes about the match performance..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="staffNotes">Staff Notes</Label>
        <Textarea
          id="staffNotes"
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          placeholder="Add any staff observations..."
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Report'}
        </Button>
      </div>
    </div>
  );
};
