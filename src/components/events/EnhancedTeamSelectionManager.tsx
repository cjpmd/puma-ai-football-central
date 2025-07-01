
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
import { FormationSelector } from './FormationSelector';
import { PositionAssignmentGrid } from './PositionAssignmentGrid';
import { PlayerSelectionList } from './PlayerSelectionList';
import { CaptainSelector } from './CaptainSelector';
import { SubstituteSelectionList } from './SubstituteSelectionList';
import { StaffSelectionForTeamSelection } from './StaffSelectionForTeamSelection';

export const EnhancedTeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  teamId,
  isOpen,
  onClose
}) => {
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>([]);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<string>('4-3-3');
  const [positionAssignments, setPositionAssignments] = useState<{ [positionId: string]: string }>({});
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

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
      console.log('Saving team selection with staff:', selectedStaff);

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
        staff_selection: JSON.stringify(
          selectedStaff.map(staffId => ({
            staffId,
            role: 'staff'
          }))
        ),
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
        return; // Don't throw an error, just don't load anything
      }

      if (data) {
        setSelectedFormation(data.formation || '4-3-3');

        // Load player positions
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

        // Load substitutes
        try {
          const subs = JSON.parse(String(data.substitute_players) || '[]').map((sub: any) => sub.playerId);
          setSubstitutes(subs);
        } catch (parseError) {
          console.error('Error parsing substitute_players:', parseError);
        }

        setCaptainId(data.captain_id || undefined);

        // Load staff selection
        try {
          const staffSelection = JSON.parse(String(data.staff_selection) || '[]').map((staff: any) => staff.staffId);
          setSelectedStaff(staffSelection);
        } catch (parseError) {
          console.error('Error parsing staff_selection:', parseError);
        }
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
      case '4-3-3':
        return [
          { id: 'gk', positionName: 'Goalkeeper', abbreviation: 'GK', positionGroup: 'goalkeeper', x: 50, y: 90 },
          { id: 'lb', positionName: 'Left Back', abbreviation: 'LB', positionGroup: 'defender', x: 15, y: 70 },
          { id: 'cb1', positionName: 'Center Back', abbreviation: 'CB', positionGroup: 'defender', x: 35, y: 70 },
          { id: 'cb2', positionName: 'Center Back', abbreviation: 'CB', positionGroup: 'defender', x: 65, y: 70 },
          { id: 'rb', positionName: 'Right Back', abbreviation: 'RB', positionGroup: 'defender', x: 85, y: 70 },
          { id: 'cm1', positionName: 'Center Mid', abbreviation: 'CM', positionGroup: 'midfielder', x: 25, y: 50 },
          { id: 'cm2', positionName: 'Center Mid', abbreviation: 'CM', positionGroup: 'midfielder', x: 50, y: 50 },
          { id: 'cm3', positionName: 'Center Mid', abbreviation: 'CM', positionGroup: 'midfielder', x: 75, y: 50 },
          { id: 'lw', positionName: 'Left Wing', abbreviation: 'LW', positionGroup: 'forward', x: 15, y: 20 },
          { id: 'st', positionName: 'Striker', abbreviation: 'ST', positionGroup: 'forward', x: 50, y: 10 },
          { id: 'rw', positionName: 'Right Wing', abbreviation: 'RW', positionGroup: 'forward', x: 85, y: 20 }
        ].map(pos => ({ ...pos, playerId: undefined }));
      case '4-4-2':
        return [
          { id: 'gk', positionName: 'Goalkeeper', abbreviation: 'GK', positionGroup: 'goalkeeper', x: 50, y: 90 },
          { id: 'lb', positionName: 'Left Back', abbreviation: 'LB', positionGroup: 'defender', x: 15, y: 70 },
          { id: 'cb1', positionName: 'Center Back', abbreviation: 'CB', positionGroup: 'defender', x: 35, y: 70 },
          { id: 'cb2', positionName: 'Center Back', abbreviation: 'CB', positionGroup: 'defender', x: 65, y: 70 },
          { id: 'rb', positionName: 'Right Back', abbreviation: 'RB', positionGroup: 'defender', x: 85, y: 70 },
          { id: 'lm', positionName: 'Left Mid', abbreviation: 'LM', positionGroup: 'midfielder', x: 15, y: 40 },
          { id: 'cm1', positionName: 'Center Mid', abbreviation: 'CM', positionGroup: 'midfielder', x: 35, y: 40 },
          { id: 'cm2', positionName: 'Center Mid', abbreviation: 'CM', positionGroup: 'midfielder', x: 65, y: 40 },
          { id: 'rm', positionName: 'Right Mid', abbreviation: 'RM', positionGroup: 'midfielder', x: 85, y: 40 },
          { id: 'st1', positionName: 'Striker', abbreviation: 'ST', positionGroup: 'forward', x: 35, y: 10 },
          { id: 'st2', positionName: 'Striker', abbreviation: 'ST', positionGroup: 'forward', x: 65, y: 10 }
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
          <Tabs defaultValue="formation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="formation">Formation & Players</TabsTrigger>
              <TabsTrigger value="substitutes">Substitutes</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="formation">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <FormationSelector
                    gameFormat={event.game_format || '11-a-side'}
                    selectedFormation={selectedFormation}
                    onFormationChange={setSelectedFormation}
                  />
                  <PositionAssignmentGrid
                    positions={positions}
                    positionAssignments={positionAssignments}
                    onPositionAssign={handlePositionAssignment}
                    squadPlayers={squadPlayers}
                  />
                </div>
                <div className="col-span-1">
                  <PlayerSelectionList
                    squadPlayers={squadPlayers}
                    positionAssignments={positionAssignments}
                    onPositionAssign={handlePositionAssignment}
                  />
                  <CaptainSelector
                    squadPlayers={squadPlayers}
                    captainId={captainId}
                    onCaptainChange={setCaptainId}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="substitutes">
              <SubstituteSelectionList
                squadPlayers={squadPlayers}
                substitutes={substitutes}
                onSubstituteToggle={handleSubstituteToggle}
              />
            </TabsContent>

            <TabsContent value="staff">
              <StaffSelectionForTeamSelection
                teamId={teamId || ''}
                eventId={event.id}
                selectedStaff={selectedStaff}
                onSelectionChange={setSelectedStaff}
              />
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

                  {selectedStaff.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Selected Staff ({selectedStaff.length})</h4>
                      <div className="text-sm text-muted-foreground">
                        {selectedStaff.length} staff member{selectedStaff.length !== 1 ? 's' : ''} selected
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
