
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save } from 'lucide-react';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { StaffSelectionSection } from './StaffSelectionSection';
import { GameFormat } from '@/types';
import { updatePlayerStatsFromEvent } from '@/services/playerStatsUpdateService';

interface TeamSelectionManagerProps {
  eventId: string;
  teamId: string;
  gameFormat: GameFormat;
}

interface PerformanceCategory {
  id: string;
  name: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  eventId,
  teamId,
  gameFormat
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTeamTab, setActiveTeamTab] = useState('team-1');
  const [activePeriodTab, setActivePeriodTab] = useState('period-1');
  const [periods, setPeriods] = useState<{ [key: string]: number }>({ 'team-1': 1 });
  const [totalTeams, setTotalTeams] = useState(1);
  const [selectedPlayers, setSelectedPlayers] = useState<{ [key: string]: string[] }>({});
  const [captains, setCaptains] = useState<{ [key: string]: string }>({});
  const [formations, setFormations] = useState<{ [key: string]: string }>({});
  const [durations, setDurations] = useState<{ [key: string]: number }>({});
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [teamPerformanceCategories, setTeamPerformanceCategories] = useState<{ [key: string]: string }>({});
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceCategories();
    loadExistingTeamSelections();
  }, [eventId, teamId]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('id, name')
        .eq('team_id', teamId)
        .order('name');

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

  const loadExistingTeamSelections = async () => {
    try {
      setLoading(true);
      
      // First check if there are any event_teams records
      const { data: eventTeams, error: eventTeamsError } = await supabase
        .from('event_teams')
        .select('team_number')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .order('team_number');

      if (eventTeamsError) throw eventTeamsError;

      // Load event_selections
      const { data: selections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .order('team_number', { ascending: true })
        .order('period_number', { ascending: true });

      if (selectionsError) throw selectionsError;

      console.log('Loaded event teams:', eventTeams);
      console.log('Loaded selections:', selections);

      if (selections && selections.length > 0) {
        const periodCounts: { [key: string]: number } = {};
        const loadedPlayers: { [key: string]: string[] } = {};
        const loadedCaptains: { [key: string]: string } = {};
        const loadedFormations: { [key: string]: string } = {};
        const loadedDurations: { [key: string]: number } = {};
        const loadedCategories: { [key: string]: string } = {};
        
        // Track maximum team number
        let maxTeamNumber = 1;
        
        selections.forEach(selection => {
          const teamNumber = selection.team_number || 1;
          const periodNumber = selection.period_number || 1;
          const teamKey = `team-${teamNumber}`;
          const selectionKey = getTeamPeriodKey(teamNumber, periodNumber);
          
          // Track max team number
          maxTeamNumber = Math.max(maxTeamNumber, teamNumber);
          
          // Track max periods per team
          if (!periodCounts[teamKey] || periodNumber > periodCounts[teamKey]) {
            periodCounts[teamKey] = periodNumber;
          }
          
          // Load player positions
          if (selection.player_positions && Array.isArray(selection.player_positions)) {
            const playerIds = selection.player_positions.map((pp: any) => pp.playerId || pp.player_id).filter(Boolean);
            loadedPlayers[selectionKey] = playerIds;
          }
          
          // Load other data
          if (selection.captain_id) loadedCaptains[selectionKey] = selection.captain_id;
          if (selection.formation) loadedFormations[selectionKey] = selection.formation;
          if (selection.duration_minutes) loadedDurations[selectionKey] = selection.duration_minutes;
          if (selection.performance_category_id) loadedCategories[selectionKey] = selection.performance_category_id;
          
          // Load staff selection (only once as it's shared)
          if (selection.staff_selection && Array.isArray(selection.staff_selection)) {
            const staffIds = selection.staff_selection
              .map((id: any) => String(id))
              .filter((id: string) => id && id !== 'null' && id !== 'undefined');
            setSelectedStaff(staffIds);
          }
        });
        
        // Ensure all teams have at least 1 period
        for (let i = 1; i <= maxTeamNumber; i++) {
          const teamKey = `team-${i}`;
          if (!periodCounts[teamKey]) {
            periodCounts[teamKey] = 1;
          }
          
          // Set default values for missing periods
          for (let j = 1; j <= periodCounts[teamKey]; j++) {
            const selectionKey = getTeamPeriodKey(i, j);
            if (!loadedDurations[selectionKey]) {
              loadedDurations[selectionKey] = 90;
            }
            if (!loadedFormations[selectionKey]) {
              loadedFormations[selectionKey] = '3-2-1';
            }
          }
        }
        
        setPeriods(periodCounts);
        setSelectedPlayers(loadedPlayers);
        setCaptains(loadedCaptains);
        setFormations(loadedFormations);
        setDurations(loadedDurations);
        setTeamPerformanceCategories(loadedCategories);
        setTotalTeams(maxTeamNumber);
        
        console.log('Final loaded state:', {
          periods: periodCounts,
          selectedPlayers: loadedPlayers,
          captains: loadedCaptains,
          formations: loadedFormations,
          totalTeams: maxTeamNumber
        });
      } else {
        // Initialize with defaults if no selections exist
        const defaultPeriods = { 'team-1': 1 };
        const defaultDurations = { [getTeamPeriodKey(1, 1)]: 90 };
        const defaultFormations = { [getTeamPeriodKey(1, 1)]: '3-2-1' };
        
        setPeriods(defaultPeriods);
        setDurations(defaultDurations);
        setFormations(defaultFormations);
        setTotalTeams(1);
      }
      
    } catch (error) {
      console.error('Error loading team selections:', error);
      // Set defaults on error
      setPeriods({ 'team-1': 1 });
      setDurations({ [getTeamPeriodKey(1, 1)]: 90 });
      setFormations({ [getTeamPeriodKey(1, 1)]: '3-2-1' });
      setTotalTeams(1);
    } finally {
      setLoading(false);
    }
  };

  const saveTeamSelections = async () => {
    try {
      setSaving(true);
      
      console.log('Saving team selections:', {
        periods,
        selectedPlayers,
        captains,
        formations,
        durations,
        teamPerformanceCategories
      });
      
      // Delete existing selections for this event and team
      await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      // Delete existing event_teams
      await supabase
        .from('event_teams')
        .delete()
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      // Create event_teams records first
      const eventTeamsToInsert = Object.keys(periods).map(teamKey => {
        const teamNumber = parseInt(teamKey.replace('team-', ''));
        return {
          event_id: eventId,
          team_id: teamId,
          team_number: teamNumber
        };
      });

      if (eventTeamsToInsert.length > 0) {
        const { error: eventTeamsError } = await supabase
          .from('event_teams')
          .insert(eventTeamsToInsert);

        if (eventTeamsError) throw eventTeamsError;
        console.log('Inserted event_teams:', eventTeamsToInsert);
      }

      // Prepare new selections
      const selectionsToInsert = [];
      
      Object.keys(periods).forEach(teamKey => {
        const teamNumber = parseInt(teamKey.replace('team-', ''));
        const teamPeriods = periods[teamKey] || 1;
        
        for (let periodNumber = 1; periodNumber <= teamPeriods; periodNumber++) {
          const selectionKey = getTeamPeriodKey(teamNumber, periodNumber);
          const playersForPeriod = selectedPlayers[selectionKey] || [];
          const captainForPeriod = captains[selectionKey] || '';
          const formationForPeriod = formations[selectionKey] || '3-2-1';
          const durationForPeriod = durations[selectionKey] || 90;
          const performanceCategoryForPeriod = teamPerformanceCategories[selectionKey] || null;
          
          const playerPositions = playersForPeriod.map((playerId, index) => ({
            playerId,
            position: `P${index + 1}`,
            isSubstitute: false
          }));

          selectionsToInsert.push({
            event_id: eventId,
            team_id: teamId,
            team_number: teamNumber,
            period_number: periodNumber,
            formation: formationForPeriod,
            captain_id: captainForPeriod || null,
            player_positions: playerPositions,
            substitutes: [],
            staff_selection: selectedStaff,
            duration_minutes: durationForPeriod,
            performance_category_id: performanceCategoryForPeriod
          });
        }
      });

      if (selectionsToInsert.length > 0) {
        const { error } = await supabase
          .from('event_selections')
          .insert(selectionsToInsert);

        if (error) throw error;
        console.log('Inserted selections:', selectionsToInsert);
      }

      // Update player statistics after saving selections
      await updatePlayerStatsFromEvent(eventId);

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

  const handleAddPeriod = (teamNumber: string) => {
    const currentPeriods = periods[teamNumber] || 0;
    const newPeriodNumber = currentPeriods + 1;
    
    setPeriods(prev => ({
      ...prev,
      [teamNumber]: newPeriodNumber
    }));
    
    // Set default duration and formation for new period
    const newPeriodKey = getTeamPeriodKey(parseInt(teamNumber.replace('team-', '')), newPeriodNumber);
    setDurations(prev => ({
      ...prev,
      [newPeriodKey]: 90
    }));
    setFormations(prev => ({
      ...prev,
      [newPeriodKey]: '3-2-1'
    }));
    
    setActivePeriodTab(`period-${newPeriodNumber}`);
  };

  const addTeam = () => {
    const teamNumbers = Object.keys(periods)
      .map(key => parseInt(key.replace('team-', '')))
      .sort((a, b) => a - b);
    
    const nextTeamNumber = teamNumbers.length > 0 ? teamNumbers[teamNumbers.length - 1] + 1 : 1;
    const newTeamKey = `team-${nextTeamNumber}`;
    
    setPeriods(prev => ({
      ...prev,
      [newTeamKey]: 1
    }));
    
    // Set default duration and formation for new team
    const newTeamPeriodKey = getTeamPeriodKey(nextTeamNumber, 1);
    setDurations(prev => ({
      ...prev,
      [newTeamPeriodKey]: 90
    }));
    setFormations(prev => ({
      ...prev,
      [newTeamPeriodKey]: '3-2-1'
    }));
    
    setTotalTeams(nextTeamNumber);
    setActiveTeamTab(newTeamKey);
    setActivePeriodTab('period-1');
  };

  const getTeamPeriodKey = (teamNumber: number, periodNumber: number) => {
    return `team-${teamNumber}-period-${periodNumber}`;
  };

  const handlePlayersChange = (teamNumber: number, periodNumber: number, players: string[]) => {
    const key = getTeamPeriodKey(teamNumber, periodNumber);
    setSelectedPlayers(prev => ({
      ...prev,
      [key]: players
    }));
  };

  const handleCaptainChange = (teamNumber: number, periodNumber: number, captainId: string) => {
    const key = getTeamPeriodKey(teamNumber, periodNumber);
    setCaptains(prev => ({
      ...prev,
      [key]: captainId
    }));
  };

  const handleFormationChange = (teamNumber: number, periodNumber: number, formation: string) => {
    const key = getTeamPeriodKey(teamNumber, periodNumber);
    setFormations(prev => ({
      ...prev,
      [key]: formation
    }));
  };

  const handleDurationChange = (teamNumber: number, periodNumber: number, duration: number) => {
    const key = getTeamPeriodKey(teamNumber, periodNumber);
    setDurations(prev => ({
      ...prev,
      [key]: duration
    }));
  };

  const handlePerformanceCategoryChange = (teamNumber: number, periodNumber: number, categoryId: string) => {
    const key = getTeamPeriodKey(teamNumber, periodNumber);
    setTeamPerformanceCategories(prev => ({
      ...prev,
      [key]: categoryId === 'none' ? '' : categoryId
    }));
  };

  const handleStaffChange = (staffIds: string[]) => {
    setSelectedStaff(staffIds);
  };

  if (loading) {
    return <div className="text-center py-4">Loading team selection...</div>;
  }

  const teamKeys = Object.keys(periods).sort((a, b) => {
    const numA = parseInt(a.replace('team-', ''));
    const numB = parseInt(b.replace('team-', ''));
    return numA - numB;
  });

  return (
    <div className="space-y-4">
      <Card className="min-h-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Team Configuration</CardTitle>
            <div className="flex gap-2">
              <Button onClick={addTeam} variant="outline" size="sm" className="h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" /> Add Team
              </Button>
              <Button 
                onClick={saveTeamSelections} 
                disabled={saving}
                size="sm" 
                className="h-7 text-xs px-2"
              >
                <Save className="h-3 w-3 mr-1" />
                {saving ? 'Saving...' : 'Save Selections'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <Tabs value={activeTeamTab} onValueChange={setActiveTeamTab} className="w-full">
            <TabsList className="grid w-full mb-2 h-8" style={{ gridTemplateColumns: `repeat(${teamKeys.length}, 1fr)` }}>
              {teamKeys.map((teamKey) => (
                <TabsTrigger key={teamKey} value={teamKey} className="text-xs py-1">
                  Team {teamKey.replace('team-', '')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {teamKeys.map((teamKey) => (
              <TabsContent key={teamKey} value={teamKey} className="mt-0">
                <Tabs value={activePeriodTab} onValueChange={setActivePeriodTab}>
                  <div className="flex items-center justify-between mb-2">
                    <TabsList className="flex-1 grid h-7" style={{ gridTemplateColumns: `repeat(${periods[teamKey] || 1}, 1fr)` }}>
                      {Array.from({ length: periods[teamKey] || 1 }, (_, i) => (
                        <TabsTrigger key={i} value={`period-${i + 1}`} className="text-xs py-1">
                          Period {i + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddPeriod(teamKey)}
                      className="ml-2 h-7 text-xs px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Period
                    </Button>
                  </div>
                  
                  {Array.from({ length: periods[teamKey] || 1 }, (_, i) => {
                    const teamNumber = parseInt(teamKey.replace('team-', ''));
                    const periodNumber = i + 1;
                    const selectionKey = getTeamPeriodKey(teamNumber, periodNumber);
                    
                    return (
                      <TabsContent key={i} value={`period-${i + 1}`} className="mt-0 space-y-4">
                        {/* Performance Category and Duration */}
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label>Performance Category</Label>
                            <Select
                              value={teamPerformanceCategories[selectionKey] || 'none'}
                              onValueChange={(value) => handlePerformanceCategoryChange(teamNumber, periodNumber, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
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
                          
                          <div className="space-y-2">
                            <Label>Duration (minutes)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="180"
                              value={durations[selectionKey] || 90}
                              onChange={(e) => handleDurationChange(teamNumber, periodNumber, parseInt(e.target.value) || 90)}
                            />
                          </div>
                        </div>
                        
                        <PlayerSelectionPanel
                          teamId={teamId}
                          selectedPlayers={selectedPlayers[selectionKey] || []}
                          captainId={captains[selectionKey] || ''}
                          onPlayersChange={(players) => handlePlayersChange(teamNumber, periodNumber, players)}
                          onCaptainChange={(captainId) => handleCaptainChange(teamNumber, periodNumber, captainId)}
                          eventType="match"
                          showFormationView={true}
                          formation={formations[selectionKey] || '3-2-1'}
                          onFormationChange={(formation) => handleFormationChange(teamNumber, periodNumber, formation)}
                          gameFormat={gameFormat}
                          eventId={eventId}
                          teamNumber={teamNumber}
                          periodNumber={periodNumber}
                        />
                        
                        <StaffSelectionSection
                          teamId={teamId}
                          selectedStaff={selectedStaff}
                          onStaffChange={handleStaffChange}
                        />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
