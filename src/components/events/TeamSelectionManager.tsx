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
    loadEventTeams();
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

  const loadEventTeams = async () => {
    try {
      const { data: eventTeams, error } = await supabase
        .from('event_teams')
        .select('team_number')
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      if (error) throw error;

      if (eventTeams && eventTeams.length > 0) {
        const maxTeamNumber = Math.max(...eventTeams.map(et => et.team_number));
        setTotalTeams(maxTeamNumber);
        
        const initialPeriods: { [key: string]: number } = {};
        const initialDurations: { [key: string]: number } = {};
        for (let i = 1; i <= maxTeamNumber; i++) {
          initialPeriods[`team-${i}`] = 1;
          initialDurations[getTeamPeriodKey(i, 1)] = 90; // Default 90 minutes
        }
        setPeriods(initialPeriods);
        setDurations(initialDurations);
      } else {
        setTotalTeams(1);
        setPeriods({ 'team-1': 1 });
        setDurations({ [getTeamPeriodKey(1, 1)]: 90 });
      }
    } catch (error) {
      console.error('Error loading event teams:', error);
      setTotalTeams(1);
      setPeriods({ 'team-1': 1 });
      setDurations({ [getTeamPeriodKey(1, 1)]: 90 });
    }
  };

  const loadExistingTeamSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', teamId);

      if (error) throw error;

      if (data && data.length > 0) {
        const periodCounts: { [key: string]: number } = {};
        const loadedPlayers: { [key: string]: string[] } = {};
        const loadedCaptains: { [key: string]: string } = {};
        const loadedFormations: { [key: string]: string } = {};
        const loadedDurations: { [key: string]: number } = {};
        const loadedCategories: { [key: string]: string } = {};
        
        data.forEach(selection => {
          const teamNumber = selection.team_number || 1;
          const periodNumber = selection.period_number || 1;
          const teamKey = `team-${teamNumber}`;
          const selectionKey = getTeamPeriodKey(teamNumber, periodNumber);
          
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
            // Ensure all values are strings
            const staffIds = selection.staff_selection
              .map((id: any) => String(id))
              .filter((id: string) => id && id !== 'null' && id !== 'undefined');
            setSelectedStaff(staffIds);
          }
        });
        
        setPeriods(periodCounts);
        setSelectedPlayers(loadedPlayers);
        setCaptains(loadedCaptains);
        setFormations(loadedFormations);
        setDurations(loadedDurations);
        setTeamPerformanceCategories(loadedCategories);
        
        const maxTeamFromSelections = Math.max(...Object.keys(periodCounts).map(key => 
          parseInt(key.replace('team-', ''))
        ));
        if (maxTeamFromSelections > totalTeams) {
          setTotalTeams(maxTeamFromSelections);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading team selections:', error);
      setLoading(false);
    }
  };

  const saveTeamSelections = async () => {
    try {
      setSaving(true);
      
      // Delete existing selections for this event and team
      await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', eventId)
        .eq('team_id', teamId);

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

  const handleAddPeriod = (teamNumber: string) => {
    const currentPeriods = periods[teamNumber] || 0;
    const newPeriodNumber = currentPeriods + 1;
    
    setPeriods({
      ...periods,
      [teamNumber]: newPeriodNumber
    });
    
    // Set default duration for new period
    const newPeriodKey = getTeamPeriodKey(parseInt(teamNumber.replace('team-', '')), newPeriodNumber);
    setDurations(prev => ({
      ...prev,
      [newPeriodKey]: 90
    }));
    
    setActivePeriodTab(`period-${newPeriodNumber}`);
  };

  const addTeam = () => {
    const teamNumbers = Object.keys(periods)
      .map(key => parseInt(key.replace('team-', '')))
      .sort((a, b) => a - b);
    
    const nextTeamNumber = teamNumbers.length > 0 ? teamNumbers[teamNumbers.length - 1] + 1 : 1;
    const newTeamKey = `team-${nextTeamNumber}`;
    
    setPeriods({
      ...periods,
      [newTeamKey]: 1
    });
    
    // Set default duration for new team
    const newTeamPeriodKey = getTeamPeriodKey(nextTeamNumber, 1);
    setDurations(prev => ({
      ...prev,
      [newTeamPeriodKey]: 90
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
            <TabsList className="grid w-full mb-2 h-8" style={{ gridTemplateColumns: `repeat(${Object.keys(periods).length}, 1fr)` }}>
              {Object.keys(periods).sort().map((teamKey) => (
                <TabsTrigger key={teamKey} value={teamKey} className="text-xs py-1">
                  Team {teamKey.replace('team-', '')}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.keys(periods).sort().map((teamKey) => (
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
