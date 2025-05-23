
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
import { PitchView } from '@/components/dashboard/PitchView';

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
  teamNumber: number;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  eventId,
  teamId,
  gameFormat,
  periodNumber,
  teamNumber
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selection, setSelection] = useState({
    formation: '3-2-1' as Formation,
    captainId: '',
    playerPositions: [] as { playerId: string; position: Position }[],
    substitutes: [] as string[],
    duration: 90
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayersAndSelection();
  }, [eventId, teamId, periodNumber, teamNumber]);

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
          duration: selectionData.duration_minutes || 90
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
      setSaving(true);

      const selectionData = {
        event_id: eventId,
        team_id: teamId,
        period_number: periodNumber,
        team_number: teamNumber,
        formation: selection.formation,
        captain_id: selection.captainId || null,
        player_positions: selection.playerPositions,
        substitutes: selection.substitutes,
        duration_minutes: selection.duration,
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
    setSelection(prev => ({
      ...prev,
      playerPositions: [
        ...prev.playerPositions.filter(pp => pp.playerId !== playerId),
        { playerId, position }
      ]
    }));
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
              value={selection.formation}
              onChange={(formation) => setSelection(prev => ({ ...prev, formation }))}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={selection.duration}
              onChange={(e) => setSelection(prev => ({ ...prev, duration: parseInt(e.target.value) || 90 }))}
              className="w-32"
            />
          </div>

          {/* Captain Selection */}
          <div className="space-y-2">
            <Label>Captain</Label>
            <Select
              value={selection.captainId}
              onValueChange={(value) => setSelection(prev => ({ ...prev, captainId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select captain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Captain</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} (#{player.squadNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Player Positions */}
          <div className="space-y-4">
            <Label>Player Positions</Label>
            <div className="grid gap-4">
              {players.map((player) => {
                const playerPosition = selection.playerPositions.find(pp => pp.playerId === player.id);
                const isSubstitute = selection.substitutes.includes(player.id);
                
                return (
                  <div key={player.id} className="flex items-center gap-4 p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">#{player.squadNumber}</div>
                    </div>
                    
                    <Select
                      value={playerPosition?.position || ''}
                      onValueChange={(position) => handlePlayerPositionChange(player.id, position as Position)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Position</SelectItem>
                        <SelectItem value="GK">GK</SelectItem>
                        <SelectItem value="DC">DC</SelectItem>
                        <SelectItem value="DL">DL</SelectItem>
                        <SelectItem value="DR">DR</SelectItem>
                        <SelectItem value="MC">MC</SelectItem>
                        <SelectItem value="ML">ML</SelectItem>
                        <SelectItem value="MR">MR</SelectItem>
                        <SelectItem value="AMC">AMC</SelectItem>
                        <SelectItem value="STC">STC</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant={isSubstitute ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSubstituteToggle(player.id)}
                    >
                      {isSubstitute ? "Sub" : "Add Sub"}
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
