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

interface TeamSelectionData {
  id?: string;
  captainId: string | null;
  formationId: string;
  performanceCategoryId: string | null;
  periodNumber: number;
  durationMinutes: number;
  playerPositions: Array<{
    playerId: string;
    positionId: string;
  }>;
  substitutes: string[];
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
  const [teamSelections, setTeamSelections] = useState<{ [teamNumber: string]: TeamSelectionData }>({});
  const [periods, setPeriods] = useState<{ [teamNumber: string]: number }>({ 'team-1': 1 });
  const { toast } = useToast();

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
        const teamSelectionData: { [teamNumber: string]: TeamSelectionData } = {};
        const periodCounts: { [teamNumber: string]: number } = {};
        
        data.forEach(selection => {
          const teamNumber = `team-${selection.team_number}`;
          const periodNumber = selection.period_number;
          
          // Keep track of the highest period number for each team
          if (!periodCounts[teamNumber] || periodNumber > periodCounts[teamNumber]) {
            periodCounts[teamNumber] = periodNumber;
          }
          
          teamSelectionData[`${teamNumber}-period-${periodNumber}`] = {
            id: selection.id,
            captainId: selection.captain_id,
            performanceCategoryId: selection.performance_category_id,
            formationId: selection.formation,
            periodNumber: selection.period_number,
            durationMinutes: selection.duration_minutes,
            playerPositions: selection.player_positions,
            substitutes: selection.substitutes
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
    const formations = getFormationsByFormat(gameFormat);
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

  const saveTeamSelection = async () => {
    try {
      // Loop through all team periods and save them
      for (const key in teamSelections) {
        const [teamNumber, periodNumber] = key.split('-').slice(1, 3).map(Number);
        const selection = teamSelections[key];
        
        if (selection.id) {
          // Update existing team selection
          const { error } = await supabase
            .from('event_selections')
            .update({
              captain_id: selection.captainId,
              performance_category_id: selection.performanceCategoryId,
              formation: selection.formationId,
              duration_minutes: selection.durationMinutes,
              player_positions: selection.playerPositions,
              substitutes: selection.substitutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', selection.id);
            
          if (error) throw error;
        } else {
          // Create new team selection
          const { error } = await supabase
            .from('event_selections')
            .insert({
              event_id: eventId,
              team_id: teamId,
              team_number: teamNumber,
              period_number: periodNumber,
              captain_id: selection.captainId,
              performance_category_id: selection.performanceCategoryId,
              formation: selection.formationId,
              duration_minutes: selection.durationMinutes,
              player_positions: selection.playerPositions,
              substitutes: selection.substitutes
            });
            
          if (error) throw error;
        }
      }
      
      toast({
        title: 'Success',
        description: 'Team selection saved successfully',
      });
      
      // Reload team selections to get updated IDs
      loadExistingTeamSelections();
    } catch (error) {
      console.error('Error saving team selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save team selection',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading team selection...</div>;
  }

  // Create tabs for each team and period
  const currentPeriod = Number(activePeriodTab.split('-')[1]);
  const currentTeam = activeTeamTab;
  const currentSelection = teamSelections[`${currentTeam}-${activePeriodTab}`] || {
    captainId: null,
    performanceCategoryId: null,
    formationId: '',
    periodNumber: currentPeriod,
    durationMinutes: 45,
    playerPositions: [],
    substitutes: []
  };
  
  // Get formations for this game format
  const formations = getFormationsByFormat(gameFormat);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Team Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTeamTab} onValueChange={setActiveTeamTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="team-1">Team 1</TabsTrigger>
              {/* Can add support for multiple teams later */}
            </TabsList>
            
            <TabsContent value="team-1" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="performanceCategory">Performance Category</Label>
                  <Select 
                    value={currentSelection.performanceCategoryId || ''}
                    onValueChange={(value) => updateTeamSelection(currentTeam, currentPeriod, { 
                      performanceCategoryId: value || null 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {performanceCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="captain">Captain</Label>
                  <Select 
                    value={currentSelection.captainId || ''}
                    onValueChange={(value) => updateTeamSelection(currentTeam, currentPeriod, {
                      captainId: value || null
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (#{player.squadNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="formation">Formation</Label>
                  <Select 
                    value={currentSelection.formationId}
                    onValueChange={(value) => updateTeamSelection(currentTeam, currentPeriod, {
                      formationId: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select formation" />
                    </SelectTrigger>
                    <SelectContent>
                      {formations.map(formation => (
                        <SelectItem key={formation.id} value={formation.id}>
                          {formation.name}
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
                    {Array.from({ length: periods[currentTeam] || 1 }, (_, i) => (
                      <TabsTrigger key={i} value={`period-${i + 1}`}>
                        Period {i + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAddPeriod(currentTeam)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Period
                  </Button>
                </div>
                
                {Array.from({ length: periods[currentTeam] || 1 }, (_, i) => (
                  <TabsContent key={i} value={`period-${i + 1}`} className="space-y-4">
                    <div className="bg-green-100 p-4 rounded-lg border border-green-200">
                      <h3 className="font-semibold mb-2">Player Selection</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {players.map(player => (
                          <div 
                            key={player.id}
                            className="flex flex-col items-center cursor-pointer hover:opacity-80"
                            onClick={() => {
                              // This will be expanded with drag-and-drop functionality
                              console.log('Selected player:', player);
                            }}
                          >
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center ${getAvailabilityColor(player.availability)} text-white font-semibold`}>
                              {player.squadNumber}
                            </div>
                            <span className="text-xs mt-1 text-center">{player.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Placeholder for pitch view with formation */}
                    <div className="bg-emerald-800 aspect-[3/2] rounded-lg p-4 text-white text-center relative">
                      <p>Formation view will be implemented here</p>
                      <p>Current Formation: {
                        formations.find(f => f.id === currentSelection.formationId)?.name || 'None selected'
                      }</p>
                      
                      {/* This will be replaced with actual player positions */}
                      <div className="absolute bottom-4 left-0 right-0">
                        <p>Substitutes area</p>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
              <div className="flex justify-end mt-4">
                <Button onClick={saveTeamSelection}>
                  Save Team Selection
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
