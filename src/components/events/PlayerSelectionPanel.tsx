
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Position, Formation, Player } from '@/types';
import { FormationSelector } from './FormationSelector';
import { getPositionsForFormation } from '@/utils/formationUtils';
import { AlertTriangle, UserPlus } from 'lucide-react';

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
  teamNumber: number;
  totalTeams?: number;
  eventType?: string;
}

interface PerformanceCategory {
  id: string;
  name: string;
  description: string | null;
}

interface PlayerConflict {
  playerId: string;
  conflictTeamNumber: number;
  conflictPeriodNumber: number;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  eventId,
  teamId,
  gameFormat,
  periodNumber,
  teamNumber,
  totalTeams = 1,
  eventType = 'training'
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [trainingOnlyPlayers, setTrainingOnlyPlayers] = useState<Player[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [playerConflicts, setPlayerConflicts] = useState<PlayerConflict[]>([]);
  const [includeTrainingOnly, setIncludeTrainingOnly] = useState(false);
  const [selection, setSelection] = useState({
    formation: '3-2-1' as Formation,
    captainId: '',
    playerPositions: [] as { playerId: string; position: Position }[],
    substitutes: [] as string[],
    duration: 90,
    performanceCategoryId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayersAndSelection();
    loadPerformanceCategories();
  }, [eventId, teamId, periodNumber, teamNumber, includeTrainingOnly]);

  useEffect(() => {
    if (totalTeams > 1) {
      loadPlayerConflicts();
    }
  }, [eventId, teamId, periodNumber, teamNumber, totalTeams, selection.playerPositions, selection.substitutes]);

  const loadPlayerConflicts = async () => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('player_positions, substitutes, team_number, period_number')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .neq('team_number', teamNumber);

      if (error) throw error;

      const conflicts: PlayerConflict[] = [];
      
      (data || []).forEach(otherSelection => {
        // Check player positions
        if (Array.isArray(otherSelection.player_positions)) {
          otherSelection.player_positions.forEach((pp: any) => {
            const playerId = pp.playerId || pp.player_id;
            if (playerId) {
              conflicts.push({
                playerId,
                conflictTeamNumber: otherSelection.team_number,
                conflictPeriodNumber: otherSelection.period_number
              });
            }
          });
        }
        
        // Check substitutes
        if (Array.isArray(otherSelection.substitutes)) {
          otherSelection.substitutes.forEach((subId: string) => {
            if (subId) {
              conflicts.push({
                playerId: subId,
                conflictTeamNumber: otherSelection.team_number,
                conflictPeriodNumber: otherSelection.period_number
              });
            }
          });
        }
      });

      setPlayerConflicts(conflicts);
    } catch (error) {
      console.error('Error loading player conflicts:', error);
    }
  };

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', teamId)
        .order('name');

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

  const loadPlayersAndSelection = async () => {
    try {
      console.log('PlayerSelectionPanel: Loading data for:', { eventId, teamId, periodNumber, teamNumber });
      setLoading(true);
      
      // Load team players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (playersError) {
        console.error('PlayerSelectionPanel: Error loading players:', playersError);
        throw playersError;
      }

      console.log('PlayerSelectionPanel: Loaded players:', playersData);
      
      // Transform database player data to match Player type
      const transformedPlayers: Player[] = (playersData || []).map(player => ({
        id: player.id,
        name: player.name,
        dateOfBirth: player.date_of_birth,
        squadNumber: player.squad_number,
        type: player.type as "outfield" | "goalkeeper",
        teamId: player.team_id,
        attributes: Array.isArray(player.attributes) ? player.attributes as any[] : [],
        objectives: Array.isArray(player.objectives) ? player.objectives as any[] : [],
        comments: Array.isArray(player.comments) ? player.comments as any[] : [],
        matchStats: typeof player.match_stats === 'object' && player.match_stats ? player.match_stats as any : {
          totalGames: 0,
          captainGames: 0,
          playerOfTheMatchCount: 0,
          totalMinutes: 0,
          minutesByPosition: {},
          recentGames: []
        },
        availability: player.availability as "amber" | "green" | "red",
        parentId: player.parent_id,
        subscriptionType: player.subscription_type as any,
        subscriptionStatus: player.subscription_status as any,
        status: player.status as "active" | "inactive",
        leaveDate: player.leave_date,
        leaveComments: player.leave_comments,
        createdAt: player.created_at,
        updatedAt: player.updated_at
      }));

      // Filter players based on event type and subscription
      const isFixture = eventType === 'fixture';
      const fullSquadPlayers = transformedPlayers.filter(p => p.subscriptionType === 'full_squad');
      const trainingOnlyPlayersData = transformedPlayers.filter(p => p.subscriptionType === 'training');
      
      setTrainingOnlyPlayers(trainingOnlyPlayersData);
      
      if (isFixture) {
        // For fixtures, start with only full squad players
        setPlayers(includeTrainingOnly ? transformedPlayers : fullSquadPlayers);
      } else {
        // For friendlies, tournaments, festivals, training - all players available
        setPlayers(transformedPlayers);
      }

      // Load existing selection
      const { data: selectionData, error: selectionError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .eq('period_number', periodNumber)
        .eq('team_number', teamNumber)
        .maybeSingle();

      if (selectionError && selectionError.code !== 'PGRST116') {
        console.error('PlayerSelectionPanel: Error loading selection:', selectionError);
        throw selectionError;
      }

      console.log('PlayerSelectionPanel: Loaded selection:', selectionData);

      if (selectionData) {
        setSelection({
          formation: selectionData.formation as Formation,
          captainId: selectionData.captain_id || '',
          playerPositions: Array.isArray(selectionData.player_positions) ? 
            (selectionData.player_positions as any[]).map(pp => ({
              playerId: pp.playerId || pp.player_id,
              position: pp.position
            })) : [],
          substitutes: Array.isArray(selectionData.substitutes) ? 
            (selectionData.substitutes as any[]).filter(sub => typeof sub === 'string') : [],
          duration: selectionData.duration_minutes || 90,
          performanceCategoryId: selectionData.performance_category_id || ''
        });
      } else {
        // Check if this is not the first period and try to duplicate from previous period
        if (periodNumber > 1) {
          await loadPreviousPeriodSelection();
        }
      }
    } catch (error: any) {
      console.error('PlayerSelectionPanel: Error in loadPlayersAndSelection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousPeriodSelection = async () => {
    try {
      const { data: previousSelection, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .eq('period_number', periodNumber - 1)
        .eq('team_number', teamNumber)
        .maybeSingle();

      if (error || !previousSelection) return;

      setSelection({
        formation: previousSelection.formation as Formation,
        captainId: previousSelection.captain_id || '',
        playerPositions: Array.isArray(previousSelection.player_positions) ? 
          (previousSelection.player_positions as any[]).map(pp => ({
            playerId: pp.playerId || pp.player_id,
            position: pp.position
          })) : [],
        substitutes: Array.isArray(previousSelection.substitutes) ? 
          (previousSelection.substitutes as any[]).filter(sub => typeof sub === 'string') : [],
        duration: previousSelection.duration_minutes || 90,
        performanceCategoryId: previousSelection.performance_category_id || ''
      });

      console.log('Duplicated selection from previous period');
    } catch (error) {
      console.error('Error loading previous period selection:', error);
    }
  };

  const handleSave = async () => {
    try {
      console.log('PlayerSelectionPanel: Saving selection:', selection);
      console.log('PlayerSelectionPanel: Save parameters:', { eventId, teamId, periodNumber, teamNumber });
      setSaving(true);

      // Filter out player positions with "none" value
      const validPlayerPositions = selection.playerPositions.filter(pp => pp.position !== 'none');

      const selectionData = {
        event_id: eventId,
        team_id: teamId,
        period_number: periodNumber,
        team_number: teamNumber,
        formation: selection.formation,
        captain_id: selection.captainId === 'none' ? null : selection.captainId || null,
        player_positions: validPlayerPositions,
        substitutes: selection.substitutes,
        duration_minutes: selection.duration,
        performance_category_id: selection.performanceCategoryId === 'none' ? null : selection.performanceCategoryId || null,
        updated_at: new Date().toISOString()
      };

      console.log('PlayerSelectionPanel: Upserting data:', selectionData);

      const { error } = await supabase
        .from('event_selections')
        .upsert(selectionData, {
          onConflict: 'event_id,team_id,period_number,team_number'
        });

      if (error) {
        console.error('PlayerSelectionPanel: Error saving selection:', error);
        throw error;
      }

      console.log('PlayerSelectionPanel: Selection saved successfully');
      toast({
        title: 'Success',
        description: `Team ${teamNumber} selection saved successfully`,
      });
    } catch (error: any) {
      console.error('PlayerSelectionPanel: Error in handleSave:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save selection',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePlayerPositionChange = (playerId: string, position: Position) => {
    console.log('PlayerSelectionPanel: Changing player position:', playerId, position);
    
    if (position === 'none') {
      setSelection(prev => ({
        ...prev,
        playerPositions: prev.playerPositions.filter(pp => pp.playerId !== playerId)
      }));
    } else {
      setSelection(prev => ({
        ...prev,
        playerPositions: [
          ...prev.playerPositions.filter(pp => pp.playerId !== playerId),
          { playerId, position }
        ]
      }));
    }
  };

  const handleSubstituteToggle = (playerId: string) => {
    console.log('PlayerSelectionPanel: Toggling substitute:', playerId);
    setSelection(prev => ({
      ...prev,
      substitutes: prev.substitutes.includes(playerId)
        ? prev.substitutes.filter(id => id !== playerId)
        : [...prev.substitutes, playerId]
    }));
  };

  const getPlayerConflict = (playerId: string): PlayerConflict | undefined => {
    return playerConflicts.find(conflict => conflict.playerId === playerId);
  };

  // Get available positions for the current formation
  const availablePositions = getPositionsForFormation(selection.formation, gameFormat as any);
  
  // Get assigned positions to track what's been taken
  const assignedPositions = selection.playerPositions.map(pp => pp.position);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading team selection...</p>
        </div>
      </div>
    );
  }

  const isFixture = eventType === 'fixture';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team {teamNumber} Selection</CardTitle>
          <CardDescription>
            Select formation, players, and positions for Period {periodNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show training-only toggle for fixtures */}
          {isFixture && trainingOnlyPlayers.length > 0 && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Switch
                id="includeTrainingOnly"
                checked={includeTrainingOnly}
                onCheckedChange={setIncludeTrainingOnly}
              />
              <Label htmlFor="includeTrainingOnly" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Include Training-Only Players ({trainingOnlyPlayers.length} available)
              </Label>
            </div>
          )}

          {/* Formation Selection */}
          <div className="space-y-2">
            <Label>Formation</Label>
            <FormationSelector
              gameFormat={gameFormat as any}
              selectedFormation={selection.formation}
              onFormationChange={(formation) => setSelection(prev => ({ 
                ...prev, 
                formation: formation as Formation,
                playerPositions: []
              }))}
            />
          </div>

          {/* Team-level settings (only show for period 1) */}
          {periodNumber === 1 && (
            <>
              {/* Performance Category */}
              {performanceCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Performance Category</Label>
                  <Select
                    value={selection.performanceCategoryId || 'none'}
                    onValueChange={(value) => setSelection(prev => ({ 
                      ...prev, 
                      performanceCategoryId: value === 'none' ? '' : value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select performance category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {performanceCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Period Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={selection.duration}
                  onChange={(e) => setSelection(prev => ({ ...prev, duration: parseInt(e.target.value) || 90 }))}
                  className="w-32"
                  min="1"
                  max="120"
                />
              </div>
            </>
          )}

          {/* Captain Selection */}
          <div className="space-y-2">
            <Label>Captain</Label>
            <Select
              value={selection.captainId || 'none'}
              onValueChange={(value) => setSelection(prev => ({ ...prev, captainId: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select captain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Captain</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} (#{player.squadNumber})
                    {player.subscriptionType === 'training' && isFixture && (
                      <Badge variant="secondary" className="ml-2 text-xs">Training Only</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Starting XI */}
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Starting XI ({availablePositions.length} positions)</Label>
              <p className="text-sm text-muted-foreground">
                Assign players to specific positions for the {selection.formation} formation
              </p>
            </div>
            
            <div className="grid gap-2">
              {availablePositions.map((position, index) => {
                const assignedPlayer = selection.playerPositions.find(pp => pp.position === position);
                const player = assignedPlayer ? players.find(p => p.id === assignedPlayer.playerId) : null;
                const conflict = player ? getPlayerConflict(player.id) : undefined;
                
                return (
                  <div key={`${position}-${index}`} className="flex items-center gap-4 p-3 border rounded">
                    <div className="w-12 text-center font-medium">{position}</div>
                    <Select
                      value={assignedPlayer?.playerId || 'none'}
                      onValueChange={(playerId) => {
                        if (playerId === 'none') {
                          setSelection(prev => ({
                            ...prev,
                            playerPositions: prev.playerPositions.filter(pp => pp.position !== position)
                          }));
                        } else {
                          setSelection(prev => ({
                            ...prev,
                            playerPositions: [
                              ...prev.playerPositions.filter(pp => pp.position !== position && pp.playerId !== playerId),
                              { playerId, position }
                            ]
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Player</SelectItem>
                        {players
                          .filter(p => {
                            const isAssigned = selection.playerPositions.some(pp => pp.playerId === p.id && pp.position !== position);
                            return !isAssigned || p.id === assignedPlayer?.playerId;
                          })
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (#{p.squadNumber})
                              {p.subscriptionType === 'training' && isFixture && (
                                <Badge variant="secondary" className="ml-2 text-xs">Training Only</Badge>
                              )}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {player && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{player.squadNumber}
                        </Badge>
                        {player.subscriptionType === 'training' && isFixture && (
                          <Badge variant="secondary" className="text-xs">
                            Training Only
                          </Badge>
                        )}
                        {conflict && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Team {conflict.conflictTeamNumber}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Substitutes */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Substitutes</Label>
            <div className="grid gap-2">
              {players
                .filter(player => !selection.playerPositions.some(pp => pp.playerId === player.id))
                .map((player) => {
                  const isSubstitute = selection.substitutes.includes(player.id);
                  const conflict = getPlayerConflict(player.id);
                  
                  return (
                    <div key={player.id} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">#{player.squadNumber}</div>
                      </div>
                      
                      {player.subscriptionType === 'training' && isFixture && (
                        <Badge variant="secondary" className="text-xs">
                          Training Only
                        </Badge>
                      )}
                      
                      {conflict && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Team {conflict.conflictTeamNumber}
                        </Badge>
                      )}
                      
                      <Button
                        variant={isSubstitute ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSubstituteToggle(player.id)}
                      >
                        {isSubstitute ? "Remove from Subs" : "Add to Subs"}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : `Save Team ${teamNumber} Selection`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
