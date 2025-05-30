import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatabaseEvent } from '@/types/event';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

interface TeamSelection {
  teamNumber: number;
  periodNumber: number;
  selectedPlayers: string[];
  substitutePlayers: string[];
  captainId: string;
  formation: string;
  durationMinutes: number;
  performanceCategoryId?: string;
}

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface PerformanceCategory {
  id: string;
  name: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [activeTeamPeriod, setActiveTeamPeriod] = useState({ team: 1, period: 1 });
  const [numberOfTeams, setNumberOfTeams] = useState(1);
  const [numberOfPeriods, setNumberOfPeriods] = useState(1);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const gameFormat = (event.game_format || '7-a-side') as any;

  useEffect(() => {
    if (isOpen) {
      loadTeamSelections();
      loadPerformanceCategories();
    }
  }, [isOpen, event.id]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', event.team_id);

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

  const loadTeamSelections = async () => {
    try {
      setLoading(true);
      
      // Initialize team selections array
      const initialSelections: TeamSelection[] = [];
      
      // Load existing selections from database
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      if (error) throw error;

      // Determine max teams and periods from existing data
      const maxTeams = Math.max(1, ...selections.map(s => s.team_number || 1));
      const maxPeriods = Math.max(1, ...selections.map(s => s.period_number || 1));
      
      setNumberOfTeams(maxTeams);
      setNumberOfPeriods(maxPeriods);

      // Create selection for each team/period combination
      for (let teamNum = 1; teamNum <= maxTeams; teamNum++) {
        for (let periodNum = 1; periodNum <= maxPeriods; periodNum++) {
          const existingSelection = selections.find(s => 
            s.team_number === teamNum && s.period_number === periodNum
          );

          if (existingSelection) {
            const playerPositions = existingSelection.player_positions as any[] || [];
            const substitutePlayersList = (existingSelection.substitute_players as string[]) || [];
            
            initialSelections.push({
              teamNumber: teamNum,
              periodNumber: periodNum,
              selectedPlayers: playerPositions.map((pp: any) => pp.playerId || pp.player_id).filter(Boolean),
              substitutePlayers: substitutePlayersList,
              captainId: existingSelection.captain_id || '',
              formation: existingSelection.formation || getDefaultFormation(gameFormat),
              durationMinutes: existingSelection.duration_minutes || 45,
              performanceCategoryId: existingSelection.performance_category_id || undefined
            });
          } else {
            initialSelections.push({
              teamNumber: teamNum,
              periodNumber: periodNum,
              selectedPlayers: [],
              substitutePlayers: [],
              captainId: '',
              formation: getDefaultFormation(gameFormat),
              durationMinutes: 45,
              performanceCategoryId: undefined
            });
          }
        }
      }

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

  const addTeam = () => {
    const newTeamNumber = numberOfTeams + 1;
    setNumberOfTeams(newTeamNumber);
    
    // Add selections for all periods for the new team
    const newSelections = [...teamSelections];
    for (let periodNum = 1; periodNum <= numberOfPeriods; periodNum++) {
      newSelections.push({
        teamNumber: newTeamNumber,
        periodNumber: periodNum,
        selectedPlayers: [],
        substitutePlayers: [],
        captainId: '',
        formation: getDefaultFormation(gameFormat),
        durationMinutes: 45,
        performanceCategoryId: undefined
      });
    }
    setTeamSelections(newSelections);
    
    // Automatically switch to the new team
    setActiveTeamPeriod(prev => ({ ...prev, team: newTeamNumber }));
  };

  const addPeriod = () => {
    const newPeriodNumber = numberOfPeriods + 1;
    setNumberOfPeriods(newPeriodNumber);
    
    // Add selections for all teams for the new period
    const newSelections = [...teamSelections];
    for (let teamNum = 1; teamNum <= numberOfTeams; teamNum++) {
      newSelections.push({
        teamNumber: teamNum,
        periodNumber: newPeriodNumber,
        selectedPlayers: [],
        substitutePlayers: [],
        captainId: '',
        formation: getDefaultFormation(gameFormat),
        durationMinutes: 45,
        performanceCategoryId: undefined
      });
    }
    setTeamSelections(newSelections);
    
    // Automatically switch to the new period
    setActiveTeamPeriod(prev => ({ ...prev, period: newPeriodNumber }));
  };

  const updateTeamSelection = (teamNumber: number, periodNumber: number, updates: Partial<TeamSelection>) => {
    setTeamSelections(prev => prev.map(selection => 
      selection.teamNumber === teamNumber && selection.periodNumber === periodNumber
        ? { ...selection, ...updates }
        : selection
    ));
  };

  const handlePlayersChange = (teamNumber: number, periodNumber: number, players: string[]) => {
    updateTeamSelection(teamNumber, periodNumber, { selectedPlayers: players });
  };

  const handleSubstitutesChange = (teamNumber: number, periodNumber: number, substitutes: string[]) => {
    updateTeamSelection(teamNumber, periodNumber, { substitutePlayers: substitutes });
  };

  const handleCaptainChange = (teamNumber: number, periodNumber: number, captainId: string) => {
    updateTeamSelection(teamNumber, periodNumber, { captainId });
  };

  const handleFormationChange = (teamNumber: number, periodNumber: number, formation: string) => {
    updateTeamSelection(teamNumber, periodNumber, { formation });
  };

  const handleDurationChange = (teamNumber: number, periodNumber: number, duration: number) => {
    updateTeamSelection(teamNumber, periodNumber, { durationMinutes: duration });
  };

  const handlePerformanceCategoryChange = (teamNumber: number, periodNumber: number, categoryId: string) => {
    updateTeamSelection(teamNumber, periodNumber, { 
      performanceCategoryId: categoryId === 'no-category' ? undefined : categoryId 
    });
  };

  const saveTeamSelections = async () => {
    try {
      setSaving(true);

      for (const selection of teamSelections) {
        // Create player positions array with calculated minutes
        const playerPositions = selection.selectedPlayers.map(playerId => ({
          playerId,
          player_id: playerId,
          position: '',
          minutes: selection.durationMinutes // Use period duration for minutes
        }));

        const selectionData = {
          event_id: event.id,
          team_id: event.team_id,
          team_number: selection.teamNumber,
          period_number: selection.periodNumber,
          player_positions: playerPositions,
          substitute_players: selection.substitutePlayers,
          captain_id: selection.captainId || null,
          formation: selection.formation,
          duration_minutes: selection.durationMinutes,
          performance_category_id: selection.performanceCategoryId || null
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

  const currentSelection = teamSelections.find(s => 
    s.teamNumber === activeTeamPeriod.team && s.periodNumber === activeTeamPeriod.period
  );

  const currentPerformanceCategory = performanceCategories.find(pc => 
    pc.id === currentSelection?.performanceCategoryId
  );

  return (
    <div className="flex flex-col h-full">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">Loading team selections...</div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Controls */}
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label>Teams:</Label>
                <Badge variant="outline">{numberOfTeams}</Badge>
                <Button size="sm" variant="outline" onClick={addTeam}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label>Periods:</Label>
                <Badge variant="outline">{numberOfPeriods}</Badge>
                <Button size="sm" variant="outline" onClick={addPeriod}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Team/Period Configuration */}
            {currentSelection && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label>Duration (mins):</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={currentSelection.durationMinutes}
                    onChange={(e) => handleDurationChange(
                      activeTeamPeriod.team, 
                      activeTeamPeriod.period, 
                      parseInt(e.target.value) || 45
                    )}
                    className="w-20"
                  />
                </div>
                {performanceCategories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label>Performance Category:</Label>
                    <Select 
                      value={currentSelection.performanceCategoryId || 'no-category'} 
                      onValueChange={(value) => handlePerformanceCategoryChange(
                        activeTeamPeriod.team, 
                        activeTeamPeriod.period, 
                        value
                      )}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-category">No category</SelectItem>
                        {performanceCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            
            {currentPerformanceCategory && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary">{currentPerformanceCategory.name}</Badge>
              </div>
            )}
          </div>

          {/* Team and Period Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs 
              value={activeTeamPeriod.team.toString()} 
              onValueChange={(value) => setActiveTeamPeriod(prev => ({ ...prev, team: parseInt(value) }))}
              className="h-full flex flex-col"
            >
              <TabsList className="flex-shrink-0 mx-4 mt-4">
                {Array.from({ length: numberOfTeams }, (_, i) => i + 1).map((teamNum) => (
                  <TabsTrigger key={teamNum} value={teamNum.toString()}>
                    Team {teamNum}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Array.from({ length: numberOfTeams }, (_, i) => i + 1).map((teamNum) => (
                <TabsContent key={teamNum} value={teamNum.toString()} className="flex-1 overflow-hidden mt-0">
                  <Tabs 
                    value={activeTeamPeriod.period.toString()} 
                    onValueChange={(value) => setActiveTeamPeriod(prev => ({ ...prev, period: parseInt(value) }))}
                    className="h-full flex flex-col"
                  >
                    <TabsList className="flex-shrink-0 mx-4 mt-4">
                      {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map((periodNum) => (
                        <TabsTrigger key={periodNum} value={periodNum.toString()}>
                          Period {periodNum}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Array.from({ length: numberOfPeriods }, (_, i) => i + 1).map((periodNum) => (
                      <TabsContent key={periodNum} value={periodNum.toString()} className="flex-1 overflow-hidden mt-0">
                        <ScrollArea className="h-full">
                          <div className="p-4">
                            {teamSelections.find(s => s.teamNumber === teamNum && s.periodNumber === periodNum) && (
                              <PlayerSelectionPanel
                                teamId={event.team_id}
                                selectedPlayers={teamSelections.find(s => s.teamNumber === teamNum && s.periodNumber === periodNum)?.selectedPlayers || []}
                                substitutePlayers={teamSelections.find(s => s.teamNumber === teamNum && s.periodNumber === periodNum)?.substitutePlayers || []}
                                captainId={teamSelections.find(s => s.teamNumber === teamNum && s.periodNumber === periodNum)?.captainId || ''}
                                onPlayersChange={(players) => handlePlayersChange(teamNum, periodNum, players)}
                                onSubstitutesChange={(substitutes) => handleSubstitutesChange(teamNum, periodNum, substitutes)}
                                onCaptainChange={(captainId) => handleCaptainChange(teamNum, periodNum, captainId)}
                                eventType={event.event_type}
                                showFormationView={true}
                                formation={teamSelections.find(s => s.teamNumber === teamNum && s.periodNumber === periodNum)?.formation || getDefaultFormation(gameFormat)}
                                onFormationChange={(formation) => handleFormationChange(teamNum, periodNum, formation)}
                                gameFormat={gameFormat}
                                eventId={event.id}
                                teamNumber={teamNum}
                                periodNumber={periodNum}
                                showSubstitutesInFormation={true}
                              />
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex-shrink-0 p-4 border-t bg-white flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={saveTeamSelections} disabled={saving}>
              {saving ? 'Saving...' : 'Save Selections'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
