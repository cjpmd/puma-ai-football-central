import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { FormationSelector } from './FormationSelector';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { GameFormat } from '@/types';

interface TeamData {
  teamNumber: number;
  performanceCategoryId?: string;
  periods: PeriodData[];
}

interface PeriodData {
  periodNumber: number;
  formation?: string;
  durationMinutes?: number;
  playerPositions?: { [position: string]: string };
  substitutePlayers?: string[];
  staffSelection?: string[];
  captainId?: string;
}

interface PerformanceCategory {
  id: string;
  name: string;
}

interface EventTeamsTableProps {
  eventId: string;
  primaryTeamId: string;
  gameFormat: GameFormat;
  onClose?: () => void;
}

export const EventTeamsTable: React.FC<EventTeamsTableProps> = ({
  eventId,
  primaryTeamId,
  gameFormat,
  onClose
}) => {
  const [teams, setTeams] = useState<TeamData[]>([{ teamNumber: 1, periods: [{ periodNumber: 1 }] }]);
  const [availableCategories, setAvailableCategories] = useState<PerformanceCategory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceCategories();
  }, [primaryTeamId]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('id, name')
        .eq('team_id', primaryTeamId)
        .order('name');

      if (error) {
        console.error('Error loading performance categories:', error);
        toast({
          title: 'Error',
          description: 'Failed to load performance categories',
          variant: 'destructive',
        });
      } else {
        setAvailableCategories(data || []);
      }
    } catch (error) {
      console.error('Error loading performance categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance categories',
        variant: 'destructive',
      });
    }
  };

  const updateTeamCategory = (teamNumber: number, categoryId: string) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return { ...team, performanceCategoryId: categoryId };
      }
      return team;
    }));
  };

  const updatePeriodFormation = (teamNumber: number, periodNumber: number, formation: string) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, formation };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const updatePeriodDuration = (teamNumber: number, periodNumber: number, durationMinutes: number) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, durationMinutes };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const updatePeriodPlayers = (teamNumber: number, periodNumber: number, playerPositions: { [position: string]: string }) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, playerPositions };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const updatePeriodSubstitutes = (teamNumber: number, periodNumber: number, substitutePlayers: string[]) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, substitutePlayers };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const updatePeriodStaff = (teamNumber: number, periodNumber: number, staffSelection: string[]) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, staffSelection };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const updatePeriodCaptain = (teamNumber: number, periodNumber: number, captainId: string) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        return {
          ...team,
          periods: team.periods.map(period => {
            if (period.periodNumber === periodNumber) {
              return { ...period, captainId };
            }
            return period;
          })
        };
      }
      return team;
    }));
  };

  const addTeam = () => {
    const newTeamNumber = Math.max(...teams.map(t => t.teamNumber), 0) + 1;
    const newTeam: TeamData = {
      teamNumber: newTeamNumber,
      periods: [{ periodNumber: 1 }]
    };
    setTeams([...teams, newTeam]);
  };

  const deleteTeam = (teamNumber: number) => {
    if (teams.length <= 1) {
      toast({
        title: 'Error',
        description: 'Cannot delete the last team',
        variant: 'destructive',
      });
      return;
    }
    setTeams(teams.filter(t => t.teamNumber !== teamNumber));
  };

  const addPeriod = (teamNumber: number) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        const newPeriodNumber = Math.max(...team.periods.map(p => p.periodNumber), 0) + 1;
        return {
          ...team,
          periods: [...team.periods, { periodNumber: newPeriodNumber }]
        };
      }
      return team;
    }));
  };

  const deletePeriod = (teamNumber: number, periodNumber: number) => {
    setTeams(teams.map(team => {
      if (team.teamNumber === teamNumber) {
        if (team.periods.length <= 1) {
          toast({
            title: 'Error',
            description: 'Cannot delete the last period',
            variant: 'destructive',
          });
          return team;
        }
        return {
          ...team,
          periods: team.periods.filter(p => p.periodNumber !== periodNumber)
        };
      }
      return team;
    }));
  };

  const handleSaveChanges = async () => {
    console.log('Saving changes...');
    console.log('Event ID:', eventId);
    console.log('Teams data:', teams);

    try {
      // 1. Fetch existing team selections for the event
      const { data: existingSelections, error: fetchError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId);

      if (fetchError) {
        console.error('Error fetching existing team selections:', fetchError);
        toast({
          title: 'Error',
          description: 'Failed to fetch existing team selections',
          variant: 'destructive',
        });
        return;
      }

      // 2. Prepare data for upsert (update or insert)
      const upsertData = teams.flatMap(team => {
        return team.periods.map(period => {
          const playerPositions = period.playerPositions || {};
          const staffSelection = period.staffSelection || [];
          const substitutePlayers = period.substitutePlayers || [];

          return {
            event_id: eventId,
            team_id: primaryTeamId,
            team_number: team.teamNumber,
            performance_category_id: team.performanceCategoryId || null,
            period_number: period.periodNumber,
            formation: period.formation || '',
            duration_minutes: period.durationMinutes || 45,
            player_positions: playerPositions,
            substitute_players: substitutePlayers,
            staff_selection: staffSelection,
            captain_id: period.captainId || null,
          };
        });
      });

      // 3. Execute the upsert operation
      const { error: upsertError } = await supabase
        .from('event_selections')
        .upsert(upsertData, { onConflict: 'event_id, team_number, period_number' });

      if (upsertError) {
        console.error('Error upserting event team selections:', upsertError);
        toast({
          title: 'Error',
          description: 'Failed to save team selections',
          variant: 'destructive',
        });
        return;
      }

      // 4. Identify and delete removed selections
      const existingKeys = existingSelections?.map(selection => `${selection.event_id}-${selection.team_number}-${selection.period_number}`) || [];
      const upsertKeys = upsertData.map(data => `${data.event_id}-${data.team_number}-${data.period_number}`);

      const selectionsToDelete = existingSelections?.filter(selection => {
        const key = `${selection.event_id}-${selection.team_number}-${selection.period_number}`;
        return !upsertKeys.includes(key);
      }) || [];

      // 5. Delete removed selections
      if (selectionsToDelete.length > 0) {
        const deleteIds = selectionsToDelete.map(selection => selection.id);

        const { error: deleteError } = await supabase
          .from('event_selections')
          .delete()
          .in('id', deleteIds);

        if (deleteError) {
          console.error('Error deleting event team selections:', deleteError);
          toast({
            title: 'Error',
            description: 'Failed to delete removed team selections',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Success',
        description: 'Team selections saved successfully!',
      });
      if (onClose) onClose();

    } catch (error) {
      console.error('Error saving team selections:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team selections',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Team Selection</h3>
        <div className="flex gap-2">
          <Button 
            onClick={addTeam} 
            size="sm"
            className="bg-puma-blue-500 hover:bg-puma-blue-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Team
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          )}
        </div>
      </div>

      {teams.map((team) => (
        <Card key={team.teamNumber} className="border-2">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">
                Team {team.teamNumber}
                {availableCategories.find(cat => cat.id === team.performanceCategoryId) && (
                  <Badge variant="outline" className="ml-2">
                    {availableCategories.find(cat => cat.id === team.performanceCategoryId)?.name}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => addPeriod(team.teamNumber)} 
                  size="sm" 
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Period
                </Button>
                {teams.length > 1 && (
                  <Button 
                    onClick={() => deleteTeam(team.teamNumber)} 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Team
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Performance Category Selection */}
            <div className="space-y-2">
              <Label>Performance Category</Label>
              <Select
                value={team.performanceCategoryId || ""}
                onValueChange={(value) => updateTeamCategory(team.teamNumber, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select performance category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Periods */}
            <div className="space-y-3">
              {team.periods.map((period) => (
                <div key={period.periodNumber} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Period {period.periodNumber}</h4>
                    {team.periods.length > 1 && (
                      <Button 
                        onClick={() => deletePeriod(team.teamNumber, period.periodNumber)} 
                        size="sm" 
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Period
                      </Button>
                    )}
                  </div>
                  
                  {/* Formation and Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Formation</Label>
                      <FormationSelector
                        gameFormat={gameFormat}
                        value={period.formation || ''}
                        onChange={(formation) => updatePeriodFormation(team.teamNumber, period.periodNumber, formation)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={period.durationMinutes || 45}
                        onChange={(e) => updatePeriodDuration(team.teamNumber, period.periodNumber, parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Player Selection */}
                  {period.formation && (
                    <div className="space-y-3">
                      <PlayerSelectionWithAvailability
                        eventId={eventId}
                        teamId={primaryTeamId}
                        formation={period.formation}
                        gameFormat={gameFormat}
                        selectedPlayers={period.playerPositions || []}
                        onPlayersChange={(players) => updatePeriodPlayers(team.teamNumber, period.periodNumber, players)}
                        substitutePlayers={period.substitutePlayers || []}
                        onSubstitutesChange={(subs) => updatePeriodSubstitutes(team.teamNumber, period.periodNumber, subs)}
                        captainId={period.captainId}
                        onCaptainChange={(captainId) => updatePeriodCaptain(team.teamNumber, period.periodNumber, captainId)}
                        performanceCategoryId={team.performanceCategoryId}
                      />

                      <StaffSelectionSection
                        teamId={primaryTeamId}
                        selectedStaff={period.staffSelection || []}
                        onStaffChange={(staff) => updatePeriodStaff(team.teamNumber, period.periodNumber, staff)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleSaveChanges} className="bg-green-500 hover:bg-green-600 text-white">
        Save Changes
      </Button>
    </div>
  );
};
