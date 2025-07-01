
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TeamSelectionManagerProps } from '@/components/events/TeamSelectionManager';
import { supabase } from '@/integrations/supabase/client';
import {
  SquadPlayer,
  PositionSlot,
} from '@/types/teamSelection';
import { PositionAssignmentGrid } from './PositionAssignmentGrid';
import { CaptainSelector } from './CaptainSelector';
import { SubstituteSelectionList } from './SubstituteSelectionList';
import { GameFormat } from '@/types';

export const EnhancedTeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  teamId,
  isOpen,
  onClose
}) => {
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<string>('1-2-3-1');
  const [positionAssignments, setPositionAssignments] = useState<{ [positionId: string]: string }>({});
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teamId) {
      loadSquadPlayers(teamId);
      loadEventSelections(event.id, teamId);
    }
  }, [teamId, event.id]);

  useEffect(() => {
    const formationPositions = getPositionsForFormation(selectedFormation);
    setPositions(formationPositions);
    // Reset position assignments when formation changes
    setPositionAssignments({});
  }, [selectedFormation]);

  const loadSquadPlayers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }

      const squad: SquadPlayer[] = data.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number || 0,
        type: player.type === 'goalkeeper' ? 'goalkeeper' : 'outfield',
        availabilityStatus: 'available',
        squadRole: 'player'
      }));

      setSquadPlayers(squad);
    } catch (error: any) {
      console.error('Error loading squad players:', error);
      toast.error('Failed to load squad players', {
        description: error.message
      });
    }
  };

  const handleSaveSelection = async () => {
    if (!teamId) {
      toast.error('No team selected');
      return;
    }

    try {
      setSaving(true);

      const selectionData = {
        event_id: event.id,
        team_id: teamId,
        team_number: 1,
        period_number: 1,
        formation: selectedFormation,
        player_positions: JSON.stringify(
          Object.entries(positionAssignments)
            .filter(([_, playerId]) => playerId)
            .map(([positionId, playerId]) => {
              const position = positions.find(p => p.id === positionId);
              const player = squadPlayers.find(p => p.id === playerId);
              return {
                playerId,
                position: position?.positionName || 'Unknown',
                playerName: player?.name || 'Unknown',
                minutes: 90,
                isSubstitute: false
              };
            })
        ),
        substitute_players: JSON.stringify(
          substitutes.map(playerId => {
            const player = squadPlayers.find(p => p.id === playerId);
            return {
              playerId,
              playerName: player?.name || 'Unknown',
              minutes: 0,
              isSubstitute: true
            };
          })
        ),
        captain_id: captainId || null,
        duration_minutes: 90,
        performance_category_id: null
      };

      const { error } = await supabase
        .from('event_selections')
        .upsert(selectionData, {
          onConflict: 'event_id,team_id,team_number,period_number'
        });

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      toast.success('Team selection saved successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving selection:', error);
      toast.error('Failed to save team selection', {
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const loadEventSelections = async (eventId: string, teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .single();

      if (error) {
        console.error('Error fetching event selections:', error);
        return;
      }

      if (data) {
        setSelectedFormation(data.formation || '1-2-3-1');

        try {
          const playerPositions = JSON.parse(String(data.player_positions) || '[]');
          const initialAssignments: { [positionId: string]: string } = {};
          playerPositions.forEach((pos: any) => {
            const position = positions.find(p => p.positionName === pos.position);
            if (position) {
              initialAssignments[position.id] = pos.playerId;
            }
          });
          setPositionAssignments(initialAssignments);
        } catch (parseError) {
          console.error('Error parsing player_positions:', parseError);
        }

        try {
          const subs = JSON.parse(String(data.substitute_players) || '[]').map((sub: any) => sub.playerId);
          setSubstitutes(subs);
        } catch (parseError) {
          console.error('Error parsing substitute_players:', parseError);
        }

        setCaptainId(data.captain_id || undefined);
      }
    } catch (error: any) {
      console.error('Error in loadEventSelections:', error);
      toast.error('Failed to load event selections', {
        description: error.message
      });
    }
  };

  const handlePositionAssignment = (positionId: string, playerId: string) => {
    setPositionAssignments(prev => ({
      ...prev,
      [positionId]: playerId
    }));
  };

  const handleSubstituteToggle = (playerId: string) => {
    if (substitutes.includes(playerId)) {
      setSubstitutes(prev => prev.filter(id => id !== playerId));
    } else {
      setSubstitutes(prev => [...prev, playerId]);
    }
  };

  const getPositionsForFormation = (formation: string): PositionSlot[] => {
    switch (formation) {
      case '1-2-3-1':
        return [
          { id: 'gk', positionName: 'Goalkeeper', abbreviation: 'GK', positionGroup: 'goalkeeper' as const, x: 50, y: 90 },
          { id: 'dl', positionName: 'Left Back', abbreviation: 'DL', positionGroup: 'defender' as const, x: 25, y: 70 },
          { id: 'dr', positionName: 'Right Back', abbreviation: 'DR', positionGroup: 'defender' as const, x: 75, y: 70 },
          { id: 'ml', positionName: 'Left Mid', abbreviation: 'ML', positionGroup: 'midfielder' as const, x: 15, y: 45 },
          { id: 'mc', positionName: 'Center Mid', abbreviation: 'MC', positionGroup: 'midfielder' as const, x: 50, y: 45 },
          { id: 'mr', positionName: 'Right Mid', abbreviation: 'MR', positionGroup: 'midfielder' as const, x: 85, y: 45 },
          { id: 'st', positionName: 'Striker', abbreviation: 'ST', positionGroup: 'forward' as const, x: 50, y: 20 }
        ].map(pos => ({ ...pos, playerId: undefined }));
      case '1-3-2-1':
        return [
          { id: 'gk', positionName: 'Goalkeeper', abbreviation: 'GK', positionGroup: 'goalkeeper' as const, x: 50, y: 90 },
          { id: 'dl', positionName: 'Left Back', abbreviation: 'DL', positionGroup: 'defender' as const, x: 20, y: 70 },
          { id: 'dc', positionName: 'Center Back', abbreviation: 'DC', positionGroup: 'defender' as const, x: 50, y: 70 },
          { id: 'dr', positionName: 'Right Back', abbreviation: 'DR', positionGroup: 'defender' as const, x: 80, y: 70 },
          { id: 'ml', positionName: 'Left Mid', abbreviation: 'ML', positionGroup: 'midfielder' as const, x: 30, y: 45 },
          { id: 'mr', positionName: 'Right Mid', abbreviation: 'MR', positionGroup: 'midfielder' as const, x: 70, y: 45 },
          { id: 'st', positionName: 'Striker', abbreviation: 'ST', positionGroup: 'forward' as const, x: 50, y: 20 }
        ].map(pos => ({ ...pos, playerId: undefined }));
      default:
        return [];
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Team Selection - {event.title}</DialogTitle>
          <DialogDescription>
            Select players and formation for {event.opponent ? `vs ${event.opponent}` : 'the event'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="squad" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="squad">Squad Management</TabsTrigger>
              <TabsTrigger value="formation">Formation & Selection</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="squad">
              <div className="space-y-4">
                <CaptainSelector
                  squadPlayers={squadPlayers}
                  captainId={captainId}
                  onCaptainChange={setCaptainId}
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Squad Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {squadPlayers.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">#{player.squadNumber}</span>
                            <span>{player.name}</span>
                            <span className="text-sm text-muted-foreground">{player.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm capitalize px-2 py-1 bg-green-100 text-green-700 rounded">
                              {player.availabilityStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="formation">
              <PositionAssignmentGrid
                positions={positions}
                positionAssignments={positionAssignments}
                onPositionAssign={handlePositionAssignment}
                squadPlayers={squadPlayers}
                formation={selectedFormation}
                onFormationChange={setSelectedFormation}
              />
              
              <div className="mt-4">
                <SubstituteSelectionList
                  squadPlayers={squadPlayers}
                  substitutes={substitutes}
                  onSubstituteToggle={handleSubstituteToggle}
                />
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Selection Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Formation: {selectedFormation}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(positionAssignments).filter(pos => positionAssignments[pos]).length} positions filled
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Starting XI</h4>
                    <div className="space-y-1">
                      {Object.entries(positionAssignments)
                        .filter(([_, playerId]) => playerId)
                        .map(([positionId, playerId]) => {
                          const position = positions.find(p => p.id === positionId);
                          const player = squadPlayers.find(p => p.id === playerId);
                          return (
                            <div key={positionId} className="flex justify-between text-sm">
                              <span>{position?.positionName}</span>
                              <span className="font-medium">{player?.name}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {substitutes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Substitutes ({substitutes.length})</h4>
                      <div className="space-y-1">
                        {substitutes.map(playerId => {
                          const player = squadPlayers.find(p => p.id === playerId);
                          return (
                            <div key={playerId} className="text-sm font-medium">
                              {player?.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {captainId && (
                    <div>
                      <h4 className="font-semibold mb-2">Captain</h4>
                      <div className="text-sm font-medium">
                        {squadPlayers.find(p => p.id === captainId)?.name}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSelection}
            disabled={saving}
            className="bg-puma-blue-500 hover:bg-puma-blue-600"
          >
            {saving ? 'Saving...' : 'Save Selection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
