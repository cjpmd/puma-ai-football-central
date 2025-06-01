import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Bell, CheckCircle, Settings, Plus, Save, Clock, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { EventAvailabilityDashboard } from './EventAvailabilityDashboard';
import { TeamSelector } from './TeamSelector';
import { availabilityService } from '@/services/availabilityService';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getFormationsByFormat, getPositionsForFormation } from '@/utils/formationUtils';

interface TeamSelectionManagerProps {
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface PerformanceCategory {
  id: string;
  name: string;
  description?: string;
}

interface Player {
  id: string;
  name: string;
  squad_number: number;
}

// Team-level state (shared across all periods)
interface TeamState {
  teamId: string;
  selectedPlayers: string[];
  substitutePlayers: string[];
  captainId: string;
  selectedStaff: string[];
  performanceCategoryId: string;
}

// Period-specific state
interface PeriodState {
  teamId: string;
  periodId: string;
  formation: string;
  durationMinutes: number;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  // Start with the event's primary team, but allow adding more
  const [teams, setTeams] = useState<string[]>([event.team_id]);
  const [periods, setPeriods] = useState<number[]>([1]);
  const [activeTeam, setActiveTeam] = useState<string>(event.team_id);
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  
  // Team-level states (shared across periods)
  const [teamStates, setTeamStates] = useState<Record<string, TeamState>>({});

  // Period-specific states
  const [periodStates, setPeriodStates] = useState<Record<string, PeriodState>>({});

  // Staff assignment tracking
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string[]>>({});

  // Initialize team states when teams change
  useEffect(() => {
    const newTeamStates: Record<string, TeamState> = { ...teamStates };
    const newPeriodStates: Record<string, PeriodState> = { ...periodStates };
    
    teams.forEach((teamId, index) => {
      if (!newTeamStates[teamId]) {
        newTeamStates[teamId] = {
          teamId,
          selectedPlayers: [],
          substitutePlayers: [],
          captainId: '',
          selectedStaff: [],
          performanceCategoryId: 'none'
        };
      }
      
      // Initialize period states for all periods
      periods.forEach(period => {
        const periodKey = `${teamId}-${period}`;
        if (!newPeriodStates[periodKey]) {
          newPeriodStates[periodKey] = {
            teamId,
            periodId: period.toString(),
            formation: '4-3-3',
            durationMinutes: 45
          };
        }
      });
    });
    
    setTeamStates(newTeamStates);
    setPeriodStates(newPeriodStates);
  }, [teams, periods]);

  // Ensure active team is valid
  useEffect(() => {
    if (!teams.includes(activeTeam)) {
      setActiveTeam(teams[0] || event.team_id);
    }
  }, [teams, activeTeam, event.team_id]);

  useEffect(() => {
    if (isOpen) {
      checkIfAvailabilityRequested();
      loadPerformanceCategories();
      loadExistingSelections();
      loadTeamPlayers();
    }
  }, [isOpen, event.id]);

  const loadTeamPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', event.team_id)
        .eq('status', 'active')
        .order('squad_number');

      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const getPlayerSurname = (playerId: string): string => {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return `Player ${playerId}`;
    
    // Extract surname (last word in name)
    const nameParts = player.name.trim().split(' ');
    const surname = nameParts[nameParts.length - 1];
    return `${surname} (#${player.squad_number})`;
  };

  const loadExistingSelections = async () => {
    try {
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id);

      if (error) throw error;

      if (selections && selections.length > 0) {
        const newTeamStates: Record<string, TeamState> = {};
        const newPeriodStates: Record<string, PeriodState> = {};
        const newStaffAssignments: Record<string, string[]> = {};
        const periodNumbers: number[] = [];
        const teamIds: string[] = [];

        selections.forEach(selection => {
          const teamId = selection.team_id;
          const periodNumber = selection.period_number || 1;
          
          if (!periodNumbers.includes(periodNumber)) {
            periodNumbers.push(periodNumber);
          }

          if (!teamIds.includes(teamId)) {
            teamIds.push(teamId);
          }

          // Team state
          if (!newTeamStates[teamId]) {
            // Safely handle player_positions JSON
            const playerPositions = Array.isArray(selection.player_positions) ? selection.player_positions : [];
            const playerIds = playerPositions
              .map((pos: any) => pos.playerId || pos.player_id)
              .filter(Boolean) || [];
            
            // Safely handle substitutes arrays - ensure they're string arrays
            const substituteIds: string[] = [];
            if (Array.isArray(selection.substitutes)) {
              selection.substitutes.forEach((id: any) => {
                if (typeof id === 'string') {
                  substituteIds.push(id);
                } else if (typeof id === 'number') {
                  substituteIds.push(String(id));
                }
              });
            }
            if (Array.isArray(selection.substitute_players)) {
              selection.substitute_players.forEach((id: any) => {
                if (typeof id === 'string' && !substituteIds.includes(id)) {
                  substituteIds.push(id);
                } else if (typeof id === 'number') {
                  const stringId = String(id);
                  if (!substituteIds.includes(stringId)) {
                    substituteIds.push(stringId);
                  }
                }
              });
            }
            
            // Safely handle staff_selection JSON
            const staffSelection = Array.isArray(selection.staff_selection) ? selection.staff_selection : [];
            const staffIds = staffSelection
              .map((staff: any) => staff.staffId)
              .filter(Boolean) || [];
            
            newTeamStates[teamId] = {
              teamId,
              selectedPlayers: playerIds,
              substitutePlayers: substituteIds,
              captainId: selection.captain_id || '',
              selectedStaff: staffIds,
              performanceCategoryId: selection.performance_category_id || 'none'
            };

            // Track staff assignments
            staffIds.forEach((staffId: string) => {
              if (!newStaffAssignments[staffId]) {
                newStaffAssignments[staffId] = [];
              }
              if (!newStaffAssignments[staffId].includes(teamId)) {
                newStaffAssignments[staffId].push(teamId);
              }
            });
          }

          // Period state
          const periodKey = `${teamId}-${periodNumber}`;
          newPeriodStates[periodKey] = {
            teamId,
            periodId: periodNumber.toString(),
            formation: selection.formation || '4-3-3',
            durationMinutes: selection.duration_minutes || 45
          };
        });

        setTeams(teamIds.length > 0 ? teamIds : [event.team_id]);
        setPeriods(periodNumbers.length > 0 ? periodNumbers.sort() : [1]);
        setTeamStates(prev => ({ ...prev, ...newTeamStates }));
        setPeriodStates(prev => ({ ...prev, ...newPeriodStates }));
        setStaffAssignments(newStaffAssignments);
      }
    } catch (error) {
      console.error('Error loading existing selections:', error);
    }
  };

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', event.team_id)
        .order('name');

      if (error) throw error;
      setPerformanceCategories(data || []);
    } catch (error) {
      console.error('Error loading performance categories:', error);
    }
  };

  const checkIfAvailabilityRequested = async () => {
    try {
      const availabilities = await availabilityService.getEventAvailability(event.id);
      setAvailabilityRequested(availabilities.length > 0);
    } catch (error) {
      console.error('Error checking availability status:', error);
    }
  };

  const currentTeamState = teamStates[activeTeam] || {
    teamId: activeTeam,
    selectedPlayers: [],
    substitutePlayers: [],
    captainId: '',
    selectedStaff: [],
    performanceCategoryId: 'none'
  };

  const currentPeriodKey = `${activeTeam}-${activePeriod}`;
  const currentPeriodState = periodStates[currentPeriodKey] || {
    teamId: activeTeam,
    periodId: activePeriod.toString(),
    formation: '4-3-3',
    durationMinutes: 45
  };

  const updateTeamState = (teamId: string, updates: Partial<TeamState>) => {
    setTeamStates(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        ...updates
      }
    }));

    if (updates.selectedStaff) {
      setStaffAssignments(prev => {
        const newAssignments = { ...prev };
        
        Object.keys(newAssignments).forEach(staffId => {
          newAssignments[staffId] = newAssignments[staffId].filter(id => id !== teamId);
          if (newAssignments[staffId].length === 0) {
            delete newAssignments[staffId];
          }
        });

        updates.selectedStaff.forEach(staffId => {
          if (!newAssignments[staffId]) {
            newAssignments[staffId] = [];
          }
          if (!newAssignments[staffId].includes(teamId)) {
            newAssignments[staffId].push(teamId);
          }
        });

        return newAssignments;
      });
    }
  };

  const updatePeriodState = (key: string, updates: Partial<PeriodState>) => {
    setPeriodStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates
      }
    }));
  };

  const addPeriod = () => {
    const newPeriod = periods.length + 1;
    setPeriods(prev => [...prev, newPeriod]);
    
    // Copy player selections from the last period to the new period for persistence
    teams.forEach(teamId => {
      const key = `${teamId}-${newPeriod}`;
      const lastPeriodKey = `${teamId}-${periods[periods.length - 1]}`;
      const lastPeriodState = periodStates[lastPeriodKey];
      
      setPeriodStates(prev => ({
        ...prev,
        [key]: {
          teamId,
          periodId: newPeriod.toString(),
          formation: lastPeriodState?.formation || '4-3-3',
          durationMinutes: lastPeriodState?.durationMinutes || 45
        }
      }));
    });
  };

  const getTeamDisplayName = (teamId: string) => {
    const teamIndex = teams.indexOf(teamId);
    const teamState = teamStates[teamId];
    
    // Add null checks to prevent crash
    if (teamState && teamState.performanceCategoryId && teamState.performanceCategoryId !== 'none') {
      const category = performanceCategories.find(c => c.id === teamState.performanceCategoryId);
      return category?.name || `Team ${teamIndex + 1}`;
    }
    return `Team ${teamIndex + 1}`;
  };

  const handleRequestAvailability = async () => {
    const allSelectedPlayers = Object.values(teamStates).flatMap(state => 
      [...state.selectedPlayers, ...state.substitutePlayers]
    );
    const allSelectedStaff = Object.values(teamStates).flatMap(state => 
      state.selectedStaff
    );

    if (allSelectedPlayers.length === 0 && allSelectedStaff.length === 0) {
      toast.error('Please select players or staff before requesting availability');
      return;
    }

    try {
      setSendingNotifications(true);
      await availabilityService.sendAvailabilityNotifications(event.id);
      toast.success('Availability notifications sent successfully!');
      setAvailabilityRequested(true);
    } catch (error) {
      console.error('Error sending availability requests:', error);
      toast.error('Failed to send availability requests');
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleSaveSelection = async () => {
    try {
      setSaving(true);

      await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id);

      const selections = [];
      
      teams.forEach((teamId, teamIndex) => {
        const teamState = teamStates[teamId];
        if (!teamState) return;

        periods.forEach(period => {
          const periodKey = `${teamId}-${period}`;
          const periodState = periodStates[periodKey];
          if (!periodState) return;

          const playerPositions = teamState.selectedPlayers.map(playerId => ({
            playerId,
            position: 'TBD',
            isSubstitute: false
          }));

          const staffSelection = teamState.selectedStaff.map(staffId => ({
            staffId
          }));

          selections.push({
            event_id: event.id,
            team_id: teamId,
            team_number: teamIndex + 1,
            period_number: period,
            formation: periodState.formation,
            player_positions: playerPositions,
            substitutes: teamState.substitutePlayers,
            substitute_players: teamState.substitutePlayers,
            captain_id: teamState.captainId || null,
            staff_selection: staffSelection,
            performance_category_id: teamState.performanceCategoryId !== 'none' ? teamState.performanceCategoryId : null,
            duration_minutes: periodState.durationMinutes
          });
        });
      });

      if (selections.length > 0) {
        const { error } = await supabase
          .from('event_selections')
          .insert(selections);

        if (error) throw error;
      }

      toast.success('Selection saved successfully!');
    } catch (error) {
      console.error('Error saving selection:', error);
      toast.error('Failed to save selection');
    } finally {
      setSaving(false);
    }
  };

  const renderCompactFormationPitch = (formation: string, selectedPlayers: string[], substitutes: string[], captainId: string, durationMinutes: number) => {
    const positions = getPositionsForFormation(formation, event.game_format as GameFormat);
    const assignedPlayers = selectedPlayers.slice(0, positions.length);
    
    // Create a simple pitch layout
    const rows = [];
    let playerIndex = 0;
    
    // Group positions by typical rows for display
    const positionRows = {
      'GK': ['GK'],
      'Defence': positions.filter(pos => pos.startsWith('D')),
      'Midfield': positions.filter(pos => pos.startsWith('M') || pos.startsWith('AM')),
      'Attack': positions.filter(pos => pos.startsWith('ST') || pos.startsWith('F'))
    };
    
    return (
      <div className="bg-green-100 p-3 rounded-lg border-2 border-green-300 min-h-[200px]">
        <div className="text-center text-xs font-medium text-green-800 mb-2">
          {formation} ({durationMinutes} min)
        </div>
        
        <div className="space-y-2">
          {Object.entries(positionRows).map(([rowName, rowPositions]) => {
            if (rowPositions.length === 0) return null;
            
            return (
              <div key={rowName} className="flex justify-center">
                <div className="flex gap-1 flex-wrap justify-center">
                  {rowPositions.map((position) => {
                    const playerId = assignedPlayers[playerIndex];
                    const playerName = playerId ? getPlayerSurname(playerId) : 'Empty';
                    const isCaptain = playerId === captainId;
                    playerIndex++;
                    
                    return (
                      <div
                        key={position}
                        className={`
                          min-w-[80px] p-1 rounded border text-center text-xs
                          ${playerId ? 'bg-white border-blue-300' : 'bg-gray-100 border-gray-300'}
                        `}
                      >
                        <div className="font-medium text-gray-600 text-xs">{position}</div>
                        <div className={`text-xs ${playerId ? 'text-gray-900' : 'text-gray-500'}`}>
                          {playerName}
                          {isCaptain && <span className="text-yellow-600"> (C)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {substitutes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-green-300">
            <div className="text-center text-xs font-medium text-green-800 mb-1">Substitutes</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {substitutes.map(playerId => (
                <Badge key={playerId} variant="outline" className="text-xs">
                  {getPlayerSurname(playerId)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFormationOverview = () => {
    const teamState = teamStates[activeTeam];
    if (!teamState) return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{getTeamDisplayName(activeTeam)} - Formation Overview</h3>
          <p className="text-sm text-muted-foreground">Complete lineup and formation details for all periods</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {periods.map(period => {
            const periodKey = `${activeTeam}-${period}`;
            const periodState = periodStates[periodKey];
            if (!periodState) return null;

            return (
              <Card key={period} className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Period {period}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {renderCompactFormationPitch(
                    periodState.formation,
                    teamState.selectedPlayers,
                    teamState.substitutePlayers,
                    teamState.captainId,
                    periodState.durationMinutes
                  )}
                  
                  {teamState.selectedStaff.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <Label className="text-xs font-medium">Staff ({teamState.selectedStaff.length})</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {teamState.selectedStaff.map(staffId => (
                          <Badge key={staffId} variant="outline" className="text-xs">
                            Staff {staffId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[1200px] h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Team Selection - {event.title}</DialogTitle>
              <DialogDescription>
                Select your teams and request availability confirmation for this event.
              </DialogDescription>
            </div>
            <Button
              onClick={handleSaveSelection}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Selection'}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden space-y-4">
          {/* Compact Top Configuration Row */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Performance Categories:</Label>
                <span className="font-semibold">{teams.length}</span>
                <Button size="sm" variant="outline" onClick={() => setTeams([...teams, `${event.team_id}-team-${teams.length + 1}`])}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Category:</Label>
                <Select 
                  value={currentTeamState.performanceCategoryId || 'none'} 
                  onValueChange={(value) => updateTeamState(activeTeam, { performanceCategoryId: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
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
            </div>
            
            <div className="flex items-center gap-4">
              {availabilityRequested && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Notifications Sent
                </Badge>
              )}
            </div>
          </div>

          {/* Team Tabs */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center justify-center gap-1">
            {teams.map((teamId) => (
              <Button
                key={teamId}
                variant={teamId === activeTeam ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTeam(teamId)}
                className={teamId === activeTeam ? "bg-white shadow-sm text-gray-900" : "text-gray-700 hover:text-gray-900"}
              >
                {getTeamDisplayName(teamId)}
              </Button>
            ))}
          </div>

          {/* Period Selection and Duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {periods.map((period) => (
                <Button
                  key={period}
                  variant={period === activePeriod ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePeriod(period)}
                >
                  Period {period}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={addPeriod}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm">Duration:</Label>
              <Input
                type="number"
                min="1"
                max="120"
                value={currentPeriodState.durationMinutes}
                onChange={(e) => updatePeriodState(currentPeriodKey, { durationMinutes: parseInt(e.target.value) || 45 })}
                className="w-16 h-8"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="players" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 grid w-full grid-cols-4">
              <TabsTrigger value="players">Player Selection</TabsTrigger>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Formation Overview
              </TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="players" className="mt-4 h-full overflow-hidden">
                <div className="h-full">
                  <PlayerSelectionWithAvailability
                    teamId={activeTeam}
                    eventId={event.id}
                    selectedPlayers={currentTeamState.selectedPlayers}
                    substitutePlayers={currentTeamState.substitutePlayers}
                    captainId={currentTeamState.captainId}
                    onPlayersChange={(players) => updateTeamState(activeTeam, { selectedPlayers: players })}
                    onSubstitutesChange={(substitutes) => updateTeamState(activeTeam, { substitutePlayers: substitutes })}
                    onCaptainChange={(captainId) => updateTeamState(activeTeam, { captainId })}
                    eventType={event.event_type}
                    showFormationView={true}
                    formation={currentPeriodState.formation}
                    onFormationChange={(formation) => updatePeriodState(currentPeriodKey, { formation })}
                    gameFormat={event.game_format as GameFormat}
                    teamNumber={teams.indexOf(activeTeam) + 1}
                    periodNumber={activePeriod}
                    showSubstitutesInFormation={true}
                  />

                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium">Selection Summary</h3>
                          <p className="text-sm text-muted-foreground">
                            {currentTeamState.selectedPlayers.length} players, {currentTeamState.substitutePlayers.length} substitutes selected
                          </p>
                        </div>
                        <Button
                          onClick={handleRequestAvailability}
                          disabled={sendingNotifications || availabilityRequested}
                          className="flex items-center gap-2 w-full sm:w-auto"
                        >
                          <Bell className="h-4 w-4" />
                          {sendingNotifications ? 'Sending...' : 
                           availabilityRequested ? 'Notifications Sent' : 
                           'Request Availability'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="mt-4 h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-4">
                    {renderFormationOverview()}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="staff" className="mt-4 h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-4">
                    <StaffSelectionSection
                      teamId={activeTeam}
                      selectedStaff={currentTeamState.selectedStaff}
                      onStaffChange={(staff) => updateTeamState(activeTeam, { selectedStaff: staff })}
                      staffAssignments={staffAssignments}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="availability" className="mt-4 h-full overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-4">
                    <EventAvailabilityDashboard event={event} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
