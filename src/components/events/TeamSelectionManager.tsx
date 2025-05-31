import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Bell, CheckCircle, Settings, Plus, Save } from 'lucide-react';
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
import { getFormationsByFormat } from '@/utils/formationUtils';

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
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  // Only use the actual team ID from the event, no fake team IDs
  const [teams, setTeams] = useState<string[]>([event.team_id]);
  const [periods, setPeriods] = useState<number[]>([1]);
  const [activeTeam, setActiveTeam] = useState<string>(event.team_id);
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Team-level states (shared across periods) - only use real team ID
  const [teamStates, setTeamStates] = useState<Record<string, TeamState>>({
    [event.team_id]: {
      teamId: event.team_id,
      selectedPlayers: [],
      substitutePlayers: [],
      captainId: '',
      selectedStaff: [],
      performanceCategoryId: 'none'
    }
  });

  // Period-specific states - only use real team ID
  const [periodStates, setPeriodStates] = useState<Record<string, PeriodState>>({
    [`${event.team_id}-1`]: {
      teamId: event.team_id,
      periodId: '1',
      formation: '4-3-3'
    }
  });

  // Staff assignment tracking
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string[]>>({});

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
    formation: '4-3-3'
  };

  useEffect(() => {
    if (isOpen) {
      checkIfAvailabilityRequested();
      loadPerformanceCategories();
      loadExistingSelections();
    }
  }, [isOpen, event.id]);

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

        selections.forEach(selection => {
          const teamId = selection.team_id;
          const periodNumber = selection.period_number || 1;
          
          if (!periodNumbers.includes(periodNumber)) {
            periodNumbers.push(periodNumber);
          }

          // Team state - only process if it's the actual team
          if (teamId === event.team_id && !newTeamStates[teamId]) {
            // Safely handle player_positions JSON
            const playerPositions = Array.isArray(selection.player_positions) ? selection.player_positions : [];
            const playerIds = playerPositions
              .map((pos: any) => pos.playerId || pos.player_id)
              .filter(Boolean) || [];
            
            // Safely handle substitutes arrays - ensure they're string arrays
            const substituteIds: string[] = Array.isArray(selection.substitutes) 
              ? (selection.substitutes as any[]).map(id => String(id)).filter(Boolean)
              : Array.isArray(selection.substitute_players) 
                ? (selection.substitute_players as any[]).map(id => String(id)).filter(Boolean)
                : [];
            
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

          // Period state - only for the actual team
          if (teamId === event.team_id) {
            const periodKey = `${teamId}-${periodNumber}`;
            newPeriodStates[periodKey] = {
              teamId,
              periodId: periodNumber.toString(),
              formation: selection.formation || '4-3-3'
            };
          }
        });

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
        .eq('team_id', event.team_id) // Always use the actual team ID
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

  const updateTeamState = (teamId: string, updates: Partial<TeamState>) => {
    setTeamStates(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        ...updates
      }
    }));

    // Update staff assignments when staff selection changes
    if (updates.selectedStaff) {
      setStaffAssignments(prev => {
        const newAssignments = { ...prev };
        
        // Remove this team from all staff assignments
        Object.keys(newAssignments).forEach(staffId => {
          newAssignments[staffId] = newAssignments[staffId].filter(id => id !== teamId);
          if (newAssignments[staffId].length === 0) {
            delete newAssignments[staffId];
          }
        });

        // Add this team to new staff assignments
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

  // Remove the addTeam function since we only work with the actual team
  const addPeriod = () => {
    if (periods.length < 4) {
      const newPeriod = periods.length + 1;
      setPeriods(prev => [...prev, newPeriod]);
      
      // Initialize period state for the actual team
      const key = `${event.team_id}-${newPeriod}`;
      setPeriodStates(prev => ({
        ...prev,
        [key]: {
          teamId: event.team_id,
          periodId: newPeriod.toString(),
          formation: '4-3-3'
        }
      }));
    }
  };

  const getAvailableFormations = () => {
    const gameFormat = event.game_format as GameFormat;
    return getFormationsByFormat(gameFormat);
  };

  const getTeamDisplayName = () => {
    if (currentTeamState.performanceCategoryId !== 'none') {
      const category = performanceCategories.find(c => c.id === currentTeamState.performanceCategoryId);
      return category?.name || 'Team 1';
    }
    return 'Team 1';
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

      // Delete existing selections for this event and team
      await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', event.team_id);

      // Save new selections - only for the actual team
      const selections = [];
      const teamState = teamStates[event.team_id];
      
      if (teamState) {
        for (const period of periods) {
          const periodKey = `${event.team_id}-${period}`;
          const periodState = periodStates[periodKey];
          if (!periodState) continue;

          const playerPositions = teamState.selectedPlayers.map(playerId => ({
            playerId,
            position: 'TBD', // Will be set in formation view
            isSubstitute: false
          }));

          const staffSelection = teamState.selectedStaff.map(staffId => ({
            staffId
          }));

          selections.push({
            event_id: event.id,
            team_id: event.team_id,
            team_number: 1, // Always team 1 since we only have one team
            period_number: period,
            formation: periodState.formation,
            player_positions: playerPositions,
            substitutes: teamState.substitutePlayers,
            substitute_players: teamState.substitutePlayers,
            captain_id: teamState.captainId || null,
            staff_selection: staffSelection,
            performance_category_id: teamState.performanceCategoryId !== 'none' ? teamState.performanceCategoryId : null,
            duration_minutes: 90
          });
        }
      }

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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Team Selection - {event.title}</DialogTitle>
              <DialogDescription>
                Select your team and request availability confirmation for this event.
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
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Period Configuration Controls */}
          <Card className="shrink-0 mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Period Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periods</Label>
                <div className="flex flex-wrap gap-2">
                  {periods.map((period) => (
                    <Badge 
                      key={period}
                      variant={period === activePeriod ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => setActivePeriod(period)}
                    >
                      Period {period}
                    </Badge>
                  ))}
                  {periods.length < 4 && (
                    <Button size="sm" variant="outline" onClick={addPeriod}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Performance Category</Label>
                <Select 
                  value={currentTeamState.performanceCategoryId} 
                  onValueChange={(value) => updateTeamState(event.team_id, { performanceCategoryId: value })}
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
            </CardContent>
          </Card>

          {/* Status Badge */}
          <div className="shrink-0 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{getTeamDisplayName()} - Period {activePeriod}</h3>
                {availabilityRequested && (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Notifications Sent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="players" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 grid w-full grid-cols-4">
              <TabsTrigger value="players" className="text-xs sm:text-sm">Players</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff</TabsTrigger>
              <TabsTrigger value="availability" className="text-xs sm:text-sm">Availability</TabsTrigger>
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="players" className="p-4 md:p-6 space-y-6 mt-0">
                <PlayerSelectionWithAvailability
                  teamId={event.team_id}
                  eventId={event.id}
                  selectedPlayers={currentTeamState.selectedPlayers}
                  substitutePlayers={currentTeamState.substitutePlayers}
                  captainId={currentTeamState.captainId}
                  onPlayersChange={(players) => updateTeamState(event.team_id, { selectedPlayers: players })}
                  onSubstitutesChange={(substitutes) => updateTeamState(event.team_id, { substitutePlayers: substitutes })}
                  onCaptainChange={(captainId) => updateTeamState(event.team_id, { captainId })}
                  eventType={event.event_type}
                  showFormationView={true}
                  formation={currentPeriodState.formation}
                  onFormationChange={(formation) => updatePeriodState(currentPeriodKey, { formation })}
                  gameFormat={event.game_format as GameFormat}
                  teamNumber={1}
                  periodNumber={activePeriod}
                  showSubstitutesInFormation={true}
                />

                <Card>
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
              </TabsContent>

              <TabsContent value="staff" className="p-4 md:p-6 mt-0">
                <StaffSelectionSection
                  teamId={event.team_id}
                  selectedStaff={currentTeamState.selectedStaff}
                  onStaffChange={(staff) => updateTeamState(event.team_id, { selectedStaff: staff })}
                  staffAssignments={staffAssignments}
                />

                <Card className="mt-6">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium">Staff Summary</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentTeamState.selectedStaff.length} staff members selected
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
              </TabsContent>

              <TabsContent value="availability" className="p-4 md:p-6 mt-0">
                <EventAvailabilityDashboard event={event} />
              </TabsContent>

              <TabsContent value="dashboard" className="p-4 md:p-6 space-y-6 mt-0">
                <EventAvailabilityDashboard event={event} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={handleRequestAvailability}
                      disabled={sendingNotifications}
                      variant="outline"
                      className="w-full"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      {sendingNotifications ? 'Sending...' : 'Resend Availability Requests'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
