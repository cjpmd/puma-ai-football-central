import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { playerStatsService } from '@/services/playerStatsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PostGameEditorProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerStats {
  id: string;
  player_id: string;
  minutes_played: number;
  position: string;
  is_captain: boolean;
  player_name?: string;
}

interface EventScores {
  home?: number;
  away?: number;
}

interface PlayerPosition {
  playerId?: string;
  player_id?: string;
  position: string;
}

export const PostGameEditor: React.FC<PostGameEditorProps> = ({
  eventId,
  isOpen,
  onClose
}) => {
  const [scores, setScores] = useState({ home: '', away: '' });
  const [playerOfMatchId, setPlayerOfMatchId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch event details and player stats
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!eventId,
  });

  const { data: playerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['event-player-stats', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_player_stats')
        .select(`
          *,
          players!inner(name)
        `)
        .eq('event_id', eventId);
      
      if (error) throw error;
      
      return data.map(stat => ({
        ...stat,
        player_name: stat.players?.name || 'Unknown Player'
      })) as PlayerStats[];
    },
    enabled: isOpen && !!eventId,
  });

  // Set initial values when data loads
  useEffect(() => {
    if (event) {
      const eventScores = event.scores as EventScores;
      if (eventScores && typeof eventScores === 'object') {
        setScores({
          home: eventScores.home?.toString() || '',
          away: eventScores.away?.toString() || ''
        });
      }
      setPlayerOfMatchId(event.player_of_match_id || 'none');
    }
  }, [event]);

  const handleSave = async () => {
    if (!event) return;
    
    setIsSaving(true);
    try {
      // Update event with scores and POTM
      const { error: eventError } = await supabase
        .from('events')
        .update({
          scores: {
            home: parseInt(scores.home) || 0,
            away: parseInt(scores.away) || 0
          },
          player_of_match_id: playerOfMatchId === 'none' ? null : playerOfMatchId,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // Generate player stats from event selections if they don't exist
      await generatePlayerStatsFromSelections();

      // Trigger player stats update for this event
      await playerStatsService.updateEventPlayerStats(eventId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });

      toast.success('Match details updated successfully');
      onClose();
    } catch (error) {
      console.error('Error saving post-game data:', error);
      toast.error('Failed to update match details');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePlayerStatsFromSelections = async () => {
    try {
      console.log('Generating player stats from event selections for event:', eventId);
      
      // Get all event selections for this event
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId);

      if (selectionsError) throw selectionsError;

      if (!selections || selections.length === 0) {
        console.log('No event selections found for event:', eventId);
        return;
      }

      // Process each selection to create player stats
      for (const selection of selections) {
        // Safely parse player_positions as array of PlayerPosition objects
        const playerPositions: PlayerPosition[] = Array.isArray(selection.player_positions) 
          ? selection.player_positions as PlayerPosition[]
          : [];
        
        // Safely parse substitutes as array of strings
        const substitutes: string[] = Array.isArray(selection.substitutes) 
          ? (selection.substitutes as string[]).filter(sub => typeof sub === 'string')
          : [];
        
        const durationMinutes = selection.duration_minutes || 90;

        // Create stats for starting players
        for (const playerPos of playerPositions) {
          // Handle both playerId and player_id properties
          const playerId = playerPos.playerId || playerPos.player_id;
          if (!playerId || typeof playerId !== 'string') continue;

          await upsertPlayerStat({
            event_id: eventId,
            player_id: playerId,
            team_number: selection.team_number || 1,
            period_number: selection.period_number,
            position: playerPos.position,
            minutes_played: durationMinutes,
            is_substitute: false,
            is_captain: selection.captain_id === playerId
          });
        }

        // Create stats for substitutes (0 minutes initially)
        for (const subId of substitutes) {
          if (typeof subId !== 'string') continue;

          await upsertPlayerStat({
            event_id: eventId,
            player_id: subId,
            team_number: selection.team_number || 1,
            period_number: selection.period_number,
            position: 'SUB',
            minutes_played: 0,
            is_substitute: true,
            is_captain: false
          });
        }
      }

      console.log('Player stats generated from selections successfully');
    } catch (error) {
      console.error('Error generating player stats from selections:', error);
    }
  };

  const upsertPlayerStat = async (statData: any) => {
    try {
      const { error } = await supabase
        .from('event_player_stats')
        .upsert(statData, {
          onConflict: 'event_id,player_id,team_number,period_number'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error upserting player stat:', error);
    }
  };

  const updatePlayerMinutes = async (statId: string, newMinutes: number) => {
    try {
      const { error } = await supabase
        .from('event_player_stats')
        .update({ minutes_played: newMinutes })
        .eq('id', statId);

      if (error) throw error;

      // Refetch the stats
      queryClient.invalidateQueries({ queryKey: ['event-player-stats', eventId] });
      toast.success('Player minutes updated');
    } catch (error) {
      console.error('Error updating player minutes:', error);
      toast.error('Failed to update player minutes');
    }
  };

  const toggleCaptain = async (statId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('event_player_stats')
        .update({ is_captain: !currentStatus })
        .eq('id', statId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['event-player-stats', eventId] });
      toast.success('Captain status updated');
    } catch (error) {
      console.error('Error updating captain status:', error);
      toast.error('Failed to update captain status');
    }
  };

  if (eventLoading || statsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            Loading match details...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Post-Game Editor - {event?.title || 'Match'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Match Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="home-score">Home Score</Label>
                  <Input
                    id="home-score"
                    type="number"
                    value={scores.home}
                    onChange={(e) => setScores(prev => ({ ...prev, home: e.target.value }))}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="away-score">Away Score</Label>
                  <Input
                    id="away-score"
                    type="number"
                    value={scores.away}
                    onChange={(e) => setScores(prev => ({ ...prev, away: e.target.value }))}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="potm">Player of the Match</Label>
                <Select value={playerOfMatchId} onValueChange={setPlayerOfMatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Player of the Match" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No selection</SelectItem>
                    {playerStats?.map((stat) => (
                      <SelectItem key={stat.player_id} value={stat.player_id}>
                        {stat.player_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Player Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Player Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {playerStats?.map((stat) => (
                  <div key={stat.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{stat.player_name}</span>
                      <Badge variant="outline">{stat.position}</Badge>
                      {stat.is_captain && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <Crown className="h-3 w-3 mr-1" />
                          Captain
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={stat.minutes_played}
                          onChange={(e) => updatePlayerMinutes(stat.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                          min="0"
                          max="150"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCaptain(stat.id, stat.is_captain)}
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
