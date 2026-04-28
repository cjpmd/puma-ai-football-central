
import { logger } from '@/lib/logger';
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
  team_id: string;
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
      logger.log('Loading event data for:', eventId);
      
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, start_time, team_id, opponent, scores, player_of_match_id, coach_notes, staff_notes')
        .eq('id', eventId)
        .single();

      if (eventError) {
        logger.error('Error loading event:', eventError);
        throw eventError;
      }
      
      logger.log('Event data loaded:', eventData);
      setEvent(eventData);
      
      // Safely handle the scores data from the database
      const scoresData = eventData?.scores as Scores | null;
      logger.log('Scores data:', scoresData);
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
      logger.error('Error loading event data:', error);
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
      logger.log('Loading team selections for event:', eventId);

      // Load event (for scores + team_id) in parallel with selections + squads
      const [{ data: selections, error }, { data: eventRow }, { data: squadRows }] = await Promise.all([
        supabase
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
          .eq('event_id', eventId),
        supabase
          .from('events')
          .select('team_id, scores')
          .eq('id', eventId)
          .single(),
        supabase
          .from('team_squads')
          .select('player_id, team_number')
          .eq('event_id', eventId),
      ]);

      if (error) throw error;

      logger.log('Raw selections:', selections);

      // Build playersByTeamNumber from team_squads (authoritative) with fallback
      // to event_selections.player_positions.
      const playerIdsByTeamNum = new Map<number, Set<string>>();
      (squadRows || []).forEach(row => {
        const n = row.team_number || 1;
        if (!playerIdsByTeamNum.has(n)) playerIdsByTeamNum.set(n, new Set());
        if (row.player_id) playerIdsByTeamNum.get(n)!.add(row.player_id);
      });
      // Fallback from event_selections for any team_number missing from team_squads
      (selections || []).forEach(s => {
        const n = s.team_number || 1;
        if (playerIdsByTeamNum.has(n) && playerIdsByTeamNum.get(n)!.size > 0) return;
        if (!playerIdsByTeamNum.has(n)) playerIdsByTeamNum.set(n, new Set());
        const positions = (s.player_positions as any[]) || [];
        positions.forEach(pp => {
          const pid = pp.playerId || pp.player_id;
          if (pid && typeof pid === 'string') playerIdsByTeamNum.get(n)!.add(pid);
        });
      });

      // Bulk-fetch all referenced players in one query
      const allPlayerIds = new Set<string>();
      playerIdsByTeamNum.forEach(set => set.forEach(id => allPlayerIds.add(id)));
      const playerById = new Map<string, Player>();
      if (allPlayerIds.size > 0) {
        const { data: playersData } = await supabase
          .from('players')
          .select('id, name, squad_number')
          .in('id', Array.from(allPlayerIds));
        (playersData || []).forEach(p => {
          playerById.set(p.id, { id: p.id, name: p.name, squadNumber: p.squad_number || 0 });
        });
      }

      const buildPlayerList = (teamNum: number): Player[] => {
        const ids = playerIdsByTeamNum.get(teamNum);
        if (!ids) return [];
        return Array.from(ids)
          .map(id => playerById.get(id))
          .filter((p): p is Player => !!p)
          .sort((a, b) => a.squadNumber - b.squadNumber);
      };

      // Create unique teams map (one entry per team_number)
      const uniqueTeamsMap = new Map<number, TeamSelection>();

      for (const selection of selections || []) {
        const teamNum = selection.team_number || 1;
        if (uniqueTeamsMap.has(teamNum)) continue;

        let performanceCategoryName = `Team ${teamNum}`;
        if (selection.performance_categories) {
          const category = selection.performance_categories as any;
          performanceCategoryName = category.name;
        }

        uniqueTeamsMap.set(teamNum, {
          teamNumber: teamNum,
          performanceCategoryName,
          players: buildPlayerList(teamNum),
        });
      }

      // Synthesize entries for team_N values that have a score recorded but
      // no event_selections row.
      const scores = (eventRow?.scores as Record<string, any>) || {};
      const missingTeamNumbers: number[] = [];
      Object.keys(scores).forEach(key => {
        const m = /^team_(\d+)$/.exec(key);
        if (!m) return;
        const n = parseInt(m[1], 10);
        if (!uniqueTeamsMap.has(n)) missingTeamNumbers.push(n);
      });

      if (missingTeamNumbers.length > 0 && eventRow?.team_id) {
        const { data: cats } = await supabase
          .from('performance_categories')
          .select('id, name')
          .eq('team_id', eventRow.team_id)
          .order('name', { ascending: true });
        const orderedCategories = (cats || []) as Array<{ id: string; name: string }>;

        missingTeamNumbers.forEach(n => {
          const cat = orderedCategories[n - 1];
          uniqueTeamsMap.set(n, {
            teamNumber: n,
            performanceCategoryName: cat?.name || `Team ${n}`,
            players: buildPlayerList(n),
          });
        });
      }

      const teamData = Array.from(uniqueTeamsMap.values()).sort((a, b) => a.teamNumber - b.teamNumber);
      logger.log('Processed team selections:', teamData);
      setTeamSelections(teamData);

    } catch (error) {
      logger.error('Error loading team selections:', error);
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
      logger.error('Error loading drill tags:', error);
    }
  };

  const loadMatchEventsSummary = async () => {
    try {
      const summary = await matchEventService.getEventMatchEventsSummary(eventId);
      setMatchEventsSummary(summary);
    } catch (error) {
      logger.error('Error loading match events summary:', error);
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
      logger.error('Error calculating score:', error);
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
      logger.log('Saving scores:', scores);
      logger.log('Saving POTM by team:', playerOfMatchByTeam);

      // Try to update player stats before saving
      try {
        const { playerStatsService } = await import('@/services/playerStatsService');
        await playerStatsService.updateEventPlayerStats(eventId);
      } catch (statsError) {
        logger.warn('Stats update failed, continuing with save:', statsError);
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
        logger.error('Error saving:', error);
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Post-game report saved successfully!',
      });
      onClose();
    } catch (error: any) {
      logger.error('Error saving post-game report:', error);
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
    <div className="space-y-4 min-w-0 overflow-hidden">
      {/* Event Info */}
      <div className="bg-muted p-3 rounded-lg overflow-hidden">
        <h3 className="font-semibold truncate">{event.title}</h3>
        <p className="text-sm text-muted-foreground">
          {event.date && format(new Date(event.date), 'PPP')} • {event.start_time}
        </p>
        {event.opponent && (
          <p className="text-sm text-muted-foreground truncate">vs {event.opponent}</p>
        )}
      </div>

      {/* Match Events Summary Section */}
      {matchEventsSummary && (matchEventsSummary.goals.length > 0 || matchEventsSummary.assists.length > 0 || matchEventsSummary.saves.length > 0) && (
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between text-base">
              <span className="truncate">Match Events</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateScore}
                disabled={calculatingScore}
                className="flex items-center gap-1 text-xs whitespace-nowrap"
              >
                <Calculator className="h-3 w-3" />
                {calculatingScore ? 'Calculating...' : 'Calculate Score'}
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Events logged during the match
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div className="overflow-hidden">
          <Label className="text-sm font-semibold">Match Results</Label>
          
          <div className="space-y-3 mt-2">
            {teamSelections.map((team) => (
              <div key={team.teamNumber} className="border rounded-lg p-3 overflow-hidden">
                <h4 className="font-medium mb-2 text-sm truncate">{team.performanceCategoryName} vs {opponentName}</h4>
                
                {/* Score Input */}
                <div className="grid grid-cols-3 gap-2 items-center mb-3">
                  <div className="text-center min-w-0">
                    <Label className="text-xs text-muted-foreground truncate block">{team.performanceCategoryName}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`team_${team.teamNumber}`] || ''}
                      onChange={(e) => handleScoreChange(`team_${team.teamNumber}`, e.target.value)}
                      className="text-center text-base font-bold h-10 mt-1"
                    />
                  </div>
                  <div className="text-center text-muted-foreground text-base font-bold">
                    vs
                  </div>
                  <div className="text-center min-w-0">
                    <Label className="text-xs text-muted-foreground truncate block">{opponentName}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scores[`opponent_${team.teamNumber}`] || ''}
                      onChange={(e) => handleScoreChange(`opponent_${team.teamNumber}`, e.target.value)}
                      className="text-center text-base font-bold h-10 mt-1"
                    />
                  </div>
                </div>
                
                {/* Outcome indicator */}
                {scores[`team_${team.teamNumber}`] !== undefined && scores[`opponent_${team.teamNumber}`] !== undefined && (
                  <div className="text-center mb-3">
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
                <div className="overflow-hidden">
                  <Label className="text-xs truncate block">POTM - {team.performanceCategoryName}</Label>
                  {team.players.length > 0 ? (
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
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      No squad players found for this team yet.
                    </p>
                  )}
                </div>
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
      {teamSelections.length > 0 && hasPermission({ resource: 'events', action: 'manage', ...(event?.team_id ? { resourceId: event.team_id } : {}) }) && (
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
