
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFormationsByFormat } from '@/utils/formationUtils';
import { Plus } from 'lucide-react';
import { GameFormat } from '@/types';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';

interface TeamSelectionManagerProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
}

interface Player {
  id: string;
  name: string;
  squadNumber: number;
  performanceCategoryId: string | null;
  availability: string;
}

interface PerformanceCategory {
  id: string;
  name: string;
}

interface PlayerPosition {
  playerId: string;
  positionId: string;
}

interface TeamSelectionData {
  id?: string;
  captainId: string | null;
  formationId: string;
  performanceCategoryId: string | null;
  periodNumber: number;
  durationMinutes: number;
  playerPositions: PlayerPosition[];
  substitutes: string[];
}

// Interface for the DB response from event_selections table
interface EventSelectionRow {
  id: string;
  event_id: string;
  team_id: string;
  team_number?: number;
  period_number: number;
  captain_id: string | null;
  performance_category_id: string | null;
  formation: string | null;
  duration_minutes: number;
  player_positions: any;
  substitutes: any;
  created_at: string;
  updated_at: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  eventId,
  teamId,
  gameFormat
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamTab, setActiveTeamTab] = useState('team-1');
  const [activePeriodTab, setActivePeriodTab] = useState('period-1');
  const [teamSelections, setTeamSelections] = useState<{ [key: string]: TeamSelectionData }>({});
  const [periods, setPeriods] = useState<{ [key: string]: number }>({ 'team-1': 1 });
  const { toast } = useToast();

  // Cast gameFormat to GameFormat type for utility functions
  const gameFormatTyped = gameFormat as GameFormat;

  useEffect(() => {
    loadPlayers();
    loadPerformanceCategories();
    loadExistingTeamSelections();
  }, [eventId, teamId]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number, performance_category_id, availability')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const transformedPlayers: Player[] = (data || []).map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        performanceCategoryId: player.performance_category_id,
        availability: player.availability
      }));

      setPlayers(transformedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    }
  };

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('id, name')
        .eq('team_id', teamId);

      if (error) throw error;

      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance categories',
        variant: 'destructive',
      });
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
        // Process existing team selections
        const teamSelectionData: { [key: string]: TeamSelectionData } = {};
        const periodCounts: { [key: string]: number } = {};
        
        // Cast data to the correct type
        const selections = data as EventSelectionRow[];
        
        selections.forEach(selection => {
          const teamNumber = selection.team_number || 1;
          const teamKey = `team-${teamNumber}`;
          const periodNumber = selection.period_number;
          
          // Keep track of the highest period number for each team
          if (!periodCounts[teamKey] || periodNumber > periodCounts[teamKey]) {
            periodCounts[teamKey] = periodNumber;
          }
          
          // Parse JSON data with proper type checking
          let playerPositions: PlayerPosition[] = [];
          let substitutes: string[] = [];
          
          try {
            // Parse player positions safely
            if (selection.player_positions) {
              // Handle different ways the data might be stored
              if (typeof selection.player_positions === 'string') {
                playerPositions = JSON.parse(selection.player_positions);
              } else if (Array.isArray(selection.player_positions)) {
                playerPositions = selection.player_positions as unknown as PlayerPosition[];
              }
            }
            
            // Parse substitutes safely
            if (selection.substitutes) {
              if (typeof selection.substitutes === 'string') {
                substitutes = JSON.parse(selection.substitutes);
              } else if (Array.isArray(selection.substitutes)) {
                substitutes = selection.substitutes as unknown as string[];
              }
            }
          } catch (e) {
            console.error('Error parsing JSON data:', e);
          }
          
          teamSelectionData[`${teamKey}-period-${periodNumber}`] = {
            id: selection.id,
            captainId: selection.captain_id,
            performanceCategoryId: selection.performance_category_id,
            formationId: selection.formation || '',
            periodNumber: selection.period_number,
            durationMinutes: selection.duration_minutes,
            playerPositions,
            substitutes
          };
        });
        
        setTeamSelections(teamSelectionData);
        setPeriods(periodCounts);
      } else {
        // Initialize with default data if no selections exist
        initializeDefaultSelections();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading team selections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team selections',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const initializeDefaultSelections = () => {
    // Get the default formation for this game format
    const formations = getFormationsByFormat(gameFormatTyped);
    const defaultFormation = formations.length > 0 ? formations[0].id : '';
    
    // Initialize default team selection data
    setTeamSelections({
      'team-1-period-1': {
        captainId: null,
        performanceCategoryId: performanceCategories.length > 0 ? performanceCategories[0].id : null,
        formationId: defaultFormation,
        periodNumber: 1,
        durationMinutes: 45,
        playerPositions: [],
        substitutes: []
      }
    });
    
    setPeriods({ 'team-1': 1 });
    setLoading(false);
  };

  const handleAddPeriod = (teamNumber: string) => {
    const currentPeriods = periods[teamNumber] || 0;
    const newPeriodNumber = currentPeriods + 1;
    
    // Create new period based on the previous period
    const prevPeriod = teamSelections[`${teamNumber}-period-${currentPeriods}`];
    
    setTeamSelections({
      ...teamSelections,
      [`${teamNumber}-period-${newPeriodNumber}`]: {
        captainId: prevPeriod?.captainId || null,
        performanceCategoryId: prevPeriod?.performanceCategoryId || null,
        formationId: prevPeriod?.formationId || '',
        periodNumber: newPeriodNumber,
        durationMinutes: prevPeriod?.durationMinutes || 45,
        playerPositions: prevPeriod?.playerPositions || [],
        substitutes: prevPeriod?.substitutes || []
      }
    });
    
    setPeriods({
      ...periods,
      [teamNumber]: newPeriodNumber
    });
    
    // Activate the new period tab
    setActivePeriodTab(`period-${newPeriodNumber}`);
  };

  const addTeam = () => {
    // Find the next available team number
    const teamNumbers = Object.keys(periods)
      .map(key => parseInt(key.replace('team-', '')))
      .sort((a, b) => a - b);
    
    const nextTeamNumber = teamNumbers.length > 0 ? teamNumbers[teamNumbers.length - 1] + 1 : 1;
    const newTeamKey = `team-${nextTeamNumber}`;
    
    // Initialize new team with one period
    setPeriods({
      ...periods,
      [newTeamKey]: 1
    });
    
    // Initialize team selection for the first period
    const formations = getFormationsByFormat(gameFormatTyped);
    const defaultFormation = formations.length > 0 ? formations[0].id : '';
    
    setTeamSelections({
      ...teamSelections,
      [`${newTeamKey}-period-1`]: {
        captainId: null,
        performanceCategoryId: performanceCategories.length > 0 ? performanceCategories[0].id : null,
        formationId: defaultFormation,
        periodNumber: 1,
        durationMinutes: 45,
        playerPositions: [],
        substitutes: []
      }
    });
    
    // Set active tabs
    setActiveTeamTab(newTeamKey);
    setActivePeriodTab('period-1');
  };

  const updateTeamSelection = (teamNumber: string, periodNumber: number, data: Partial<TeamSelectionData>) => {
    const key = `${teamNumber}-period-${periodNumber}`;
    
    setTeamSelections({
      ...teamSelections,
      [key]: {
        ...teamSelections[key],
        ...data
      }
    });
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case 'green':
        return 'bg-green-500';
      case 'amber':
        return 'bg-amber-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCurrentTeamNumber = () => {
    return parseInt(activeTeamTab.replace('team-', ''));
  };

  const getCurrentPeriodNumber = () => {
    return parseInt(activePeriodTab.replace('period-', ''));
  };

  if (loading) {
    return <div className="text-center py-8">Loading team selection...</div>;
  }

  const currentPeriod = getCurrentPeriodNumber();
  const currentTeam = activeTeamTab;
  const teamNumber = getCurrentTeamNumber();
  const currentSelection = teamSelections[`${currentTeam}-${activePeriodTab}`] || {
    captainId: null,
    performanceCategoryId: null,
    formationId: '',
    periodNumber: currentPeriod,
    durationMinutes: 45,
    playerPositions: [],
    substitutes: []
  };
  
  const formations = getFormationsByFormat(gameFormatTyped);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button onClick={addTeam} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Team
            </Button>
          </div>
          
          <Tabs value={activeTeamTab} onValueChange={setActiveTeamTab} className="w-full">
            <TabsList className="mb-4">
              {Object.keys(periods).sort().map((teamKey) => (
                <TabsTrigger key={teamKey} value={teamKey}>Team {teamKey.replace('team-', '')}</TabsTrigger>
              ))}
            </TabsList>
            
            {Object.keys(periods).sort().map((teamKey) => (
              <TabsContent key={teamKey} value={teamKey} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="performanceCategory">Performance Category</Label>
                    <Select 
                      value={currentSelection.performanceCategoryId || 'none'}
                      onValueChange={(value) => updateTeamSelection(currentTeam, currentPeriod, { 
                        performanceCategoryId: value === 'none' ? null : value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {performanceCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Period Duration (minutes)</Label>
                    <Input 
                      id="duration" 
                      type="number" 
                      min="1"
                      value={currentSelection.durationMinutes}
                      onChange={(e) => updateTeamSelection(currentTeam, currentPeriod, {
                        durationMinutes: parseInt(e.target.value) || 45
                      })}
                    />
                  </div>
                </div>
                
                <Tabs value={activePeriodTab} onValueChange={setActivePeriodTab}>
                  <div className="flex items-center space-x-2 mb-2">
                    <TabsList>
                      {Array.from({ length: periods[teamKey] || 1 }, (_, i) => (
                        <TabsTrigger key={i} value={`period-${i + 1}`}>
                          Period {i + 1}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAddPeriod(teamKey)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Period
                    </Button>
                  </div>
                  
                  {Array.from({ length: periods[teamKey] || 1 }, (_, i) => (
                    <TabsContent key={i} value={`period-${i + 1}`} className="space-y-4">
                      <PlayerSelectionPanel
                        eventId={eventId}
                        teamId={teamId}
                        gameFormat={gameFormat}
                        periodNumber={i + 1}
                        teamNumber={parseInt(teamKey.replace('team-', ''))}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
