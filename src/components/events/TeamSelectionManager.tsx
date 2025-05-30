
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DatabaseEvent } from '@/types/event';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { FormationSelector } from './FormationSelector';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, Trophy, MapPin, Calendar } from 'lucide-react';

interface TeamSelection {
  teamNumber: number;
  selectedPlayers: string[];
  substitutePlayers: string[];
  captainId: string;
  formation: string;
  minutesPlayed: { [playerId: string]: number };
}

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [activeTeam, setActiveTeam] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const numTeams = event.teams?.length || 1;
  const gameFormat = (event.game_format || '7-a-side') as any;

  useEffect(() => {
    if (isOpen) {
      loadTeamSelections();
    }
  }, [isOpen, event.id]);

  const loadTeamSelections = async () => {
    try {
      setLoading(true);
      
      // Initialize team selections array
      const initialSelections: TeamSelection[] = [];
      for (let i = 1; i <= numTeams; i++) {
        initialSelections.push({
          teamNumber: i,
          selectedPlayers: [],
          substitutePlayers: [],
          captainId: '',
          formation: getDefaultFormation(gameFormat),
          minutesPlayed: {}
        });
      }

      // Load existing selections from database
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      if (error) throw error;

      // Update selections with database data
      selections?.forEach(selection => {
        const teamIndex = selection.team_number - 1;
        if (teamIndex >= 0 && teamIndex < initialSelections.length) {
          const playerPositions = selection.player_positions as any[] || [];
          initialSelections[teamIndex] = {
            teamNumber: selection.team_number,
            selectedPlayers: playerPositions.map((pp: any) => pp.playerId || pp.player_id).filter(Boolean),
            substitutePlayers: selection.substitute_players as string[] || [],
            captainId: selection.captain_id || '',
            formation: selection.formation || getDefaultFormation(gameFormat),
            minutesPlayed: selection.minutes_played as { [playerId: string]: number } || {}
          };
        }
      });

      setTeamSelections(initialSelections);
    } catch (error) {
      console.error('Error loading team selections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team selections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultFormation = (gameFormat: string) => {
    const maxPlayers = parseInt(gameFormat.split('-')[0]);
    switch (maxPlayers) {
      case 3: return '2-1';
      case 4: return '1-2-1';
      case 5: return '1-1-2-1';
      case 7: return '1-1-3-1';
      case 9: return '3-2-3';
      case 11: return '1-4-4-2';
      default: return '1-1-3-1';
    }
  };

  const updateTeamSelection = (teamNumber: number, updates: Partial<TeamSelection>) => {
    setTeamSelections(prev => prev.map(selection => 
      selection.teamNumber === teamNumber 
        ? { ...selection, ...updates }
        : selection
    ));
  };

  const handlePlayersChange = (teamNumber: number, players: string[]) => {
    updateTeamSelection(teamNumber, { selectedPlayers: players });
  };

  const handleSubstitutesChange = (teamNumber: number, substitutes: string[]) => {
    updateTeamSelection(teamNumber, { substitutePlayers: substitutes });
  };

  const handleCaptainChange = (teamNumber: number, captainId: string) => {
    updateTeamSelection(teamNumber, { captainId });
  };

  const handleFormationChange = (teamNumber: number, formation: string) => {
    updateTeamSelection(teamNumber, { formation });
  };

  const handleMinutesChange = (teamNumber: number, playerId: string, minutes: number) => {
    const currentSelection = teamSelections.find(s => s.teamNumber === teamNumber);
    if (currentSelection) {
      const newMinutesPlayed = { ...currentSelection.minutesPlayed, [playerId]: minutes };
      updateTeamSelection(teamNumber, { minutesPlayed: newMinutesPlayed });
    }
  };

  const saveTeamSelections = async () => {
    try {
      setSaving(true);

      for (const selection of teamSelections) {
        // Create player positions array
        const playerPositions = selection.selectedPlayers.map(playerId => ({
          playerId,
          player_id: playerId,
          position: '', // You can add position logic here if needed
          minutes: selection.minutesPlayed[playerId] || 0
        }));

        const selectionData = {
          event_id: event.id,
          team_id: event.team_id,
          team_number: selection.teamNumber,
          period_number: 1, // Default to period 1
          player_positions: playerPositions,
          substitute_players: selection.substitutePlayers,
          captain_id: selection.captainId || null,
          formation: selection.formation,
          minutes_played: selection.minutesPlayed
        };

        // Upsert the selection
        const { error } = await supabase
          .from('event_selections')
          .upsert(selectionData, {
            onConflict: 'event_id,team_id,team_number,period_number'
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Team selections saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving team selections:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save team selections',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentSelection = teamSelections.find(s => s.teamNumber === activeTeam);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Selection - {event.title}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {event.start_time} - {event.end_time}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
            {event.opponent && (
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                vs {event.opponent}
              </div>
            )}
            <Badge variant="outline">{gameFormat}</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">Loading team selections...</div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {numTeams > 1 && (
                <div className="flex-shrink-0 mb-4">
                  <Tabs value={activeTeam.toString()} onValueChange={(value) => setActiveTeam(parseInt(value))}>
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${numTeams}, 1fr)` }}>
                      {Array.from({ length: numTeams }, (_, i) => i + 1).map((teamNum) => (
                        <TabsTrigger key={teamNum} value={teamNum.toString()}>
                          Team {teamNum}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="space-y-6 pr-4">
                  {currentSelection && (
                    <>
                      <PlayerSelectionPanel
                        teamId={event.team_id}
                        selectedPlayers={currentSelection.selectedPlayers}
                        substitutePlayers={currentSelection.substitutePlayers}
                        captainId={currentSelection.captainId}
                        onPlayersChange={(players) => handlePlayersChange(activeTeam, players)}
                        onSubstitutesChange={(substitutes) => handleSubstitutesChange(activeTeam, substitutes)}
                        onCaptainChange={(captainId) => handleCaptainChange(activeTeam, captainId)}
                        eventType={event.event_type}
                        showFormationView={true}
                        formation={currentSelection.formation}
                        onFormationChange={(formation) => handleFormationChange(activeTeam, formation)}
                        gameFormat={gameFormat}
                        eventId={event.id}
                        teamNumber={activeTeam}
                        periodNumber={1}
                      />

                      <Separator />

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Minutes Played
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid gap-4">
                              {currentSelection.selectedPlayers.map((playerId) => {
                                const minutes = currentSelection.minutesPlayed[playerId] || 0;
                                return (
                                  <div key={playerId} className="flex items-center gap-4">
                                    <Label className="flex-1">
                                      Player ID: {playerId}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="120"
                                      value={minutes}
                                      onChange={(e) => handleMinutesChange(activeTeam, playerId, parseInt(e.target.value) || 0)}
                                      className="w-20"
                                      placeholder="0"
                                    />
                                    <span className="text-sm text-muted-foreground">minutes</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveTeamSelections} disabled={saving}>
            {saving ? 'Saving...' : 'Save Selections'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
