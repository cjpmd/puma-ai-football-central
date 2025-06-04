import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormationSelector } from './FormationSelector';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { GameFormat } from '@/types';
import { DatabaseEvent } from '@/types/event';
import { Plus, Trash2 } from 'lucide-react';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface EventSelection {
  id: string;
  team_id: string;
  team_number: number;
  period_number: number;
  formation: string;
  player_positions: any[];
  substitutes: any[];
  staff_selection: any[];
  captain_id?: string;
  performance_category_id?: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({ 
  event, 
  isOpen, 
  onClose 
}) => {
  const [selections, setSelections] = useState<EventSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const { teams: userTeams } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadSelections();
      loadTeams();
    }
  }, [isOpen, event.id]);

  const loadSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .order('team_number', { ascending: true })
        .order('period_number', { ascending: true });

      if (error) throw error;
      setSelections(data || []);
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const { data: eventTeamsData, error: eventTeamsError } = await supabase
        .from('event_teams')
        .select('team_id')
        .eq('event_id', event.id);

      if (eventTeamsError) throw eventTeamsError;
      
      if (eventTeamsData && eventTeamsData.length > 0) {
        const teamIds = eventTeamsData.map(et => et.team_id);
        const eventTeams = userTeams.filter(team => teamIds.includes(team.id));
        setTeams(eventTeams);
      } else {
        const primaryTeam = userTeams.find(t => t.id === event.team_id);
        if (primaryTeam) {
          setTeams([primaryTeam]);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const addTeam = async () => {
    const maxTeamNumber = Math.max(...selections.map(s => s.team_number), 0);
    const newTeamNumber = maxTeamNumber + 1;
    
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .insert({
          event_id: event.id,
          team_id: event.team_id,
          team_number: newTeamNumber,
          period_number: 1,
          formation: '4-4-2',
          player_positions: [],
          substitutes: [],
          staff_selection: []
        })
        .select()
        .single();

      if (error) throw error;
      setSelections(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  const deleteTeam = async (teamNumber: number) => {
    try {
      const { error } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_number', teamNumber);

      if (error) throw error;
      setSelections(prev => prev.filter(s => s.team_number !== teamNumber));
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const addPeriod = async (teamNumber: number) => {
    const teamSelections = selections.filter(s => s.team_number === teamNumber);
    const maxPeriodNumber = Math.max(...teamSelections.map(s => s.period_number), 0);
    const newPeriodNumber = maxPeriodNumber + 1;
    
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .insert({
          event_id: event.id,
          team_id: event.team_id,
          team_number: teamNumber,
          period_number: newPeriodNumber,
          formation: '4-4-2',
          player_positions: [],
          substitutes: [],
          staff_selection: []
        })
        .select()
        .single();

      if (error) throw error;
      setSelections(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding period:', error);
    }
  };

  const deletePeriod = async (teamNumber: number, periodNumber: number) => {
    try {
      const { error } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_number', teamNumber)
        .eq('period_number', periodNumber);

      if (error) throw error;
      setSelections(prev => prev.filter(s => !(s.team_number === teamNumber && s.period_number === periodNumber)));
    } catch (error) {
      console.error('Error deleting period:', error);
    }
  };

  const updateSelection = async (selectionId: string, updates: Partial<EventSelection>) => {
    try {
      const { error } = await supabase
        .from('event_selections')
        .update(updates)
        .eq('id', selectionId);

      if (error) throw error;
      
      setSelections(prev => prev.map(s => 
        s.id === selectionId ? { ...s, ...updates } : s
      ));
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  };

  const groupTeamsAndPeriods = () => {
    const grouped: { [teamNumber: number]: EventSelection[] } = {};
    
    selections.forEach(selection => {
      if (!grouped[selection.team_number]) {
        grouped[selection.team_number] = [];
      }
      grouped[selection.team_number].push(selection);
    });
    
    // Sort periods within each team
    Object.keys(grouped).forEach(teamNumber => {
      grouped[parseInt(teamNumber)].sort((a, b) => a.period_number - b.period_number);
    });
    
    return grouped;
  };

  if (loading) {
    return <div className="text-center py-4">Loading team selections...</div>;
  }

  const groupedSelections = groupTeamsAndPeriods();
  const teamNumbers = Object.keys(groupedSelections).map(Number).sort((a, b) => a - b);

  return (
    <div className="h-[70vh] max-h-[600px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Team Selection</h3>
        <Button onClick={addTeam} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Team
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6">
          {teamNumbers.map(teamNumber => {
            const teamSelections = groupedSelections[teamNumber];
            const canDeleteTeam = teamNumbers.length > 1;
            
            return (
              <Card key={teamNumber}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      Team {teamNumber}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => addPeriod(teamNumber)} 
                        size="sm" 
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Period
                      </Button>
                      {canDeleteTeam && (
                        <Button 
                          onClick={() => deleteTeam(teamNumber)} 
                          size="sm" 
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue={`period-${teamSelections[0]?.period_number || 1}`}>
                    <div className="flex justify-between items-center mb-4">
                      <TabsList>
                        {teamSelections.map(selection => {
                          const canDeletePeriod = teamSelections.length > 1;
                          
                          return (
                            <div key={selection.id} className="flex items-center">
                              <TabsTrigger value={`period-${selection.period_number}`}>
                                Period {selection.period_number}
                              </TabsTrigger>
                              {canDeletePeriod && (
                                <Button
                                  onClick={() => deletePeriod(teamNumber, selection.period_number)}
                                  size="sm"
                                  variant="ghost"
                                  className="ml-1 h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </TabsList>
                    </div>

                    {teamSelections.map(selection => (
                      <TabsContent key={selection.id} value={`period-${selection.period_number}`}>
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium mb-2">Formation</h4>
                            <FormationSelector
                              gameFormat={event.game_format as GameFormat || '7-a-side'}
                              selectedFormation={selection.formation}
                              onFormationChange={(formation) => 
                                updateSelection(selection.id, { formation })
                              }
                            />
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Player Selection</h4>
                            <PlayerSelectionWithAvailability
                              eventId={event.id}
                              teamId={selection.team_id}
                              formation={selection.formation}
                              gameFormat={event.game_format as GameFormat || '7-a-side'}
                              selectedPlayers={selection.player_positions.reduce((acc, pos) => {
                                if (pos.playerId || pos.player_id) {
                                  acc[pos.position] = pos.playerId || pos.player_id;
                                }
                                return acc;
                              }, {} as { [position: string]: string })}
                              onPlayersChange={(players) => {
                                const playerPositions = Object.entries(players).map(([position, playerId]) => ({
                                  position,
                                  playerId: playerId || null
                                }));
                                updateSelection(selection.id, { player_positions: playerPositions });
                              }}
                              substitutePlayers={selection.substitutes.map(sub => sub.playerId || sub.player_id).filter(Boolean)}
                              onSubstitutesChange={(subs) => {
                                const substitutes = subs.map(playerId => ({ playerId }));
                                updateSelection(selection.id, { substitutes });
                              }}
                              captainId={selection.captain_id || ''}
                              onCaptainChange={(captainId) => 
                                updateSelection(selection.id, { captain_id: captainId })
                              }
                            />
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Staff Selection</h4>
                            <StaffSelectionSection
                              teamId={selection.team_id}
                              selectedStaff={selection.staff_selection || []}
                              onStaffChange={(staff) => 
                                updateSelection(selection.id, { staff_selection: staff })
                              }
                            />
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
