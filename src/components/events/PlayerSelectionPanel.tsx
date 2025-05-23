import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Position, Formation, Player } from '@/types';
import { FormationSelector } from './FormationSelector';
import { getPositionsForFormation } from '@/utils/formationUtils';

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
  teamNumber: number;
}

interface PerformanceCategory {
  id: string;
  name: string;
  description: string | null;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  eventId,
  teamId,
  gameFormat,
  periodNumber,
  teamNumber
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
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
  }, [eventId, teamId, periodNumber, teamNumber]);

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
      
      setPlayers(transformedPlayers);

      // Load existing selection with proper WHERE clause including team_number
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

      // Use the correct unique constraint fields for upsert (now includes team_number)
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
      // Remove the player from positions
      setSelection(prev => ({
        ...prev,
        playerPositions: prev.playerPositions.filter(pp => pp.playerId !== playerId)
      }));
    } else {
      // Add or update the player position
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
          {/* Formation Selection */}
          <div className="space-y-2">
            <Label>Formation</Label>
            <FormationSelector
              gameFormat={gameFormat as any}
              selectedFormation={selection.formation}
              onFormationChange={(formation) => setSelection(prev => ({ 
                ...prev, 
                formation: formation as Formation,
                // Clear player positions when formation changes
                playerPositions: []
              }))}
            />
          </div>

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
                
                return (
                  <div key={`${position}-${index}`} className="flex items-center gap-4 p-3 border rounded">
                    <div className="w-12 text-center font-medium">{position}</div>
                    <Select
                      value={assignedPlayer?.playerId || 'none'}
                      onValueChange={(playerId) => {
                        if (playerId === 'none') {
                          // Remove assignment
                          setSelection(prev => ({
                            ...prev,
                            playerPositions: prev.playerPositions.filter(pp => pp.position !== position)
                          }));
                        } else {
                          // Assign player to this position
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
                            // Show unassigned players or the currently assigned player
                            const isAssigned = selection.playerPositions.some(pp => pp.playerId === p.id && pp.position !== position);
                            return !isAssigned || p.id === assignedPlayer?.playerId;
                          })
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (#{p.squadNumber})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {player && (
                      <Badge variant="outline" className="text-xs">
                        #{player.squadNumber}
                      </Badge>
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
                  
                  return (
                    <div key={player.id} className="flex items-center gap-4 p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">#{player.squadNumber}</div>
                      </div>
                      
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
