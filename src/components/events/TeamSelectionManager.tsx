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

interface TeamConfig {
  teamNumber: number;
  numberOfPeriods: number;
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
  const [teamConfigs, setTeamConfigs] = useState<TeamConfig[]>([]);
  const [activeTeamPeriod, setActiveTeamPeriod] = useState({ team: 1, period: 1 });
  const [numberOfTeams, setNumberOfTeams] = useState(1);
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
      
      const initialSelections: TeamSelection[] = [];
      const initialConfigs: TeamConfig[] = [];
      
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      if (error) throw error;

      const maxTeams = Math.max(1, ...selections.map(s => s.team_number || 1));
      setNumberOfTeams(maxTeams);

      // Create team configs
      for (let teamNum = 1; teamNum <= maxTeams; teamNum++) {
        const teamSelections = selections.filter(s => s.team_number === teamNum);
        const maxPeriods = Math.max(1, ...teamSelections.map(s => s.period_number || 1));
        const performanceCategoryId = teamSelections[0]?.performance_category_id || undefined;
        
        initialConfigs.push({
          teamNumber: teamNum,
          numberOfPeriods: maxPeriods,
          performanceCategoryId
        });

        for (let periodNum = 1; periodNum <= maxPeriods; periodNum++) {
          const existingSelection = teamSelections.find(s => s.period_number === periodNum);

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
              performanceCategoryId
            });
          }
        }
      }

      setTeamConfigs(initialConfigs);
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
    
    // Add config for new team
    const newConfig: TeamConfig = {
      teamNumber: newTeamNumber,
      numberOfPeriods: 1,
      performanceCategoryId: undefined
    };
    setTeamConfigs(prev => [...prev, newConfig]);
    
    // Add selection for the new team's first period
    const newSelection: TeamSelection = {
      teamNumber: newTeamNumber,
      periodNumber: 1,
      selectedPlayers: [],
      substitutePlayers: [],
      captainId: '',
      formation: getDefaultFormation(gameFormat),
      durationMinutes: 45,
      performanceCategoryId: undefined
    };
    setTeamSelections(prev => [...prev, newSelection]);
    
    setActiveTeamPeriod({ team: newTeamNumber, period: 1 });
  };

  const addPeriodToTeam = (teamNumber: number) => {
    const teamConfig = teamConfigs.find(tc => tc.teamNumber === teamNumber);
    if (!teamConfig) return;

    const newPeriodNumber = teamConfig.numberOfPeriods + 1;
    
    // Update team config
    setTeamConfigs(prev => prev.map(tc => 
      tc.teamNumber === teamNumber 
        ? { ...tc, numberOfPeriods: newPeriodNumber }
        : tc
    ));
    
    // Add selection for the new period
    const newSelection: TeamSelection = {
      teamNumber,
      periodNumber: newPeriodNumber,
      selectedPlayers: [],
      substitutePlayers: [],
      captainId: '',
      formation: getDefaultFormation(gameFormat),
      durationMinutes: 45,
      performanceCategoryId: teamConfig.performanceCategoryId
    };
    setTeamSelections(prev => [...prev, newSelection]);
    
    setActiveTeamPeriod({ team: teamNumber, period: newPeriodNumber });
  };

  const updateTeamSelection = (teamNumber: number, periodNumber: number, updates: Partial<TeamSelection>) => {
    setTeamSelections(prev => prev.map(selection => 
      selection.teamNumber === teamNumber && selection.periodNumber === periodNumber
        ? { ...selection, ...updates }
        : selection
    ));
  };

  const updateTeamPerformanceCategory = (teamNumber: number, categoryId?: string) => {
    // Update team config
    setTeamConfigs(prev => prev.map(tc => 
      tc.teamNumber === teamNumber 
        ? { ...tc, performanceCategoryId: categoryId }
        : tc
    ));
    
    // Update all selections for this team
    setTeamSelections(prev => prev.map(selection => 
      selection.teamNumber === teamNumber
        ? { ...selection, performanceCategoryId: categoryId }
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

  const saveTeamSelections = async () => {
    try {
      setSaving(true);

      for (const selection of teamSelections) {
        const playerPositions = selection.selectedPlayers.map(playerId => ({
          playerId,
          player_id: playerId,
          position: '',
          minutes: selection.durationMinutes
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

  const getPerformanceCategoryName = (teamNumber: number) => {
    const teamConfig = teamConfigs.find(tc => tc.teamNumber === teamNumber);
    if (teamConfig?.performanceCategoryId) {
      const category = performanceCategories.find(pc => pc.id === teamConfig.performanceCategoryId);
      return category?.name || `Performance Category ${teamNumber}`;
    }
    return `Performance Category ${teamNumber}`;
  };

  const currentSelection = teamSelections.find(s => 
    s.teamNumber === activeTeamPeriod.team && s.periodNumber === activeTeamPeriod.period
  );

  const currentTeamConfig = teamConfigs.find(tc => tc.teamNumber === activeTeamPeriod.team);
  const currentPerformanceCategory = performanceCategories.find(pc => 
    pc.id === currentTeamConfig?.performanceCategoryId
  );

  return (
    <div className="flex flex-col h-[75vh]">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">Loading team selections...</div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Enhanced Controls Section */}
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <div className="flex flex-wrap items-center gap-4 mb-2">
              {/* Performance Categories */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Performance Categories:</Label>
                <Badge variant="outline" className="text-sm">{numberOfTeams}</Badge>
                <Button size="sm" variant="outline" onClick={addTeam} className="h-7 w-7 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Performance Category Selection */}
              {performanceCategories.length > 0 && currentTeamConfig && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Category:</Label>
                  <Select 
                    value={currentTeamConfig.performanceCategoryId || 'no-category'} 
                    onValueChange={(value) => updateTeamPerformanceCategory(
                      activeTeamPeriod.team, 
                      value === 'no-category' ? undefined : value
                    )}
                  >
                    <SelectTrigger className="w-40 h-7">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-category">None</SelectItem>
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

            {/* Performance Category Badge */}
            {currentPerformanceCategory && (
              <div className="mb-2">
                <Badge variant="secondary" className="text-sm">
                  {currentPerformanceCategory.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Performance Category and Period Tabs */}
          <div className="flex-1 min-h-0">
            <Tabs 
              value={activeTeamPeriod.team.toString()} 
              onValueChange={(value) => setActiveTeamPeriod(prev => ({ ...prev, team: parseInt(value) }))}
              className="h-full flex flex-col"
            >
              <TabsList className="flex-shrink-0 mx-2 mt-2">
                {Array.from({ length: numberOfTeams }, (_, i) => i + 1).map((teamNum) => (
                  <TabsTrigger key={teamNum} value={teamNum.toString()} className="text-xs">
                    {getPerformanceCategoryName(teamNum)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Array.from({ length: numberOfTeams }, (_, i) => i + 1).map((teamNum) => {
                const teamConfig = teamConfigs.find(tc => tc.teamNumber === teamNum);
                const teamPeriods = teamConfig?.numberOfPeriods || 1;
                
                return (
                  <TabsContent key={teamNum} value={teamNum.toString()} className="flex-1 min-h-0 mt-2">
                    <Tabs 
                      value={activeTeamPeriod.period.toString()} 
                      onValueChange={(value) => setActiveTeamPeriod(prev => ({ ...prev, period: parseInt(value) }))}
                      className="h-full flex flex-col"
                    >
                      <div className="flex-shrink-0 mx-2 mb-2">
                        {/* Period tabs and controls row */}
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <TabsList>
                              {Array.from({ length: teamPeriods }, (_, i) => i + 1).map((periodNum) => (
                                <TabsTrigger key={periodNum} value={periodNum.toString()} className="text-xs">
                                  Period {periodNum}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => addPeriodToTeam(teamNum)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Duration for current period */}
                          {currentSelection && (
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium whitespace-nowrap">Duration:</Label>
                              <div className="flex items-center gap-1">
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
                                  className="w-16 h-7 text-sm"
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {Array.from({ length: teamPeriods }, (_, i) => i + 1).map((periodNum) => (
                        <TabsContent key={periodNum} value={periodNum.toString()} className="flex-1 min-h-0 mt-0">
                          <div className="h-full px-2 pb-16">
                            <ScrollArea className="h-full">
                              <div className="pr-2">
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
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Footer with Save Button - Fixed at bottom */}
          <div className="flex-shrink-0 p-4 border-t bg-white flex justify-between items-center">
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
            <Button onClick={saveTeamSelections} disabled={saving} size="sm">
              {saving ? 'Saving...' : 'Save Selections'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
