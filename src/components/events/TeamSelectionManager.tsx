
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Bell, CheckCircle, Settings, Plus } from 'lucide-react';
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
  const [teams, setTeams] = useState<string[]>([event.team_id]);
  const [periods, setPeriods] = useState<number[]>([1]);
  const [activeTeam, setActiveTeam] = useState<string>(event.team_id);
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  
  // Team-level states (shared across periods)
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

  // Period-specific states
  const [periodStates, setPeriodStates] = useState<Record<string, PeriodState>>({
    [`${event.team_id}-1`]: {
      teamId: event.team_id,
      periodId: '1',
      formation: '4-3-3'
    }
  });

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
    }
  }, [isOpen, event.id]);

  const loadPerformanceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', activeTeam)
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

  const addTeam = () => {
    if (teams.length < 4) {
      const newTeamId = `team-${teams.length + 1}`;
      setTeams(prev => [...prev, newTeamId]);
      
      // Initialize team state
      setTeamStates(prev => ({
        ...prev,
        [newTeamId]: {
          teamId: newTeamId,
          selectedPlayers: [],
          substitutePlayers: [],
          captainId: '',
          selectedStaff: [],
          performanceCategoryId: 'none'
        }
      }));

      // Initialize period states for all existing periods
      periods.forEach(period => {
        const key = `${newTeamId}-${period}`;
        setPeriodStates(prev => ({
          ...prev,
          [key]: {
            teamId: newTeamId,
            periodId: period.toString(),
            formation: '4-3-3'
          }
        }));
      });
    }
  };

  const addPeriod = () => {
    if (periods.length < 4) {
      const newPeriod = periods.length + 1;
      setPeriods(prev => [...prev, newPeriod]);
      
      // Initialize period states for all teams (inheriting team settings)
      teams.forEach(teamId => {
        const key = `${teamId}-${newPeriod}`;
        setPeriodStates(prev => ({
          ...prev,
          [key]: {
            teamId,
            periodId: newPeriod.toString(),
            formation: '4-3-3'
          }
        }));
      });
    }
  };

  const getAvailableFormations = () => {
    const gameFormat = event.game_format as GameFormat;
    return getFormationsByFormat(gameFormat);
  };

  const getTeamDisplayName = () => {
    if (currentTeamState.performanceCategoryId !== 'none') {
      const category = performanceCategories.find(c => c.id === currentTeamState.performanceCategoryId);
      return category?.name || `Team ${teams.indexOf(activeTeam) + 1}`;
    }
    return `Team ${teams.indexOf(activeTeam) + 1}`;
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Team Selection - {event.title}</DialogTitle>
          <DialogDescription>
            Select your team and request availability confirmation for this event.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Team Configuration Controls */}
          <Card className="shrink-0 mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Team Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Teams</Label>
                <div className="flex flex-wrap gap-2">
                  {teams.map((teamId, index) => (
                    <Badge 
                      key={teamId}
                      variant={teamId === activeTeam ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => setActiveTeam(teamId)}
                    >
                      Team {index + 1}
                    </Badge>
                  ))}
                  {teams.length < 4 && (
                    <Button size="sm" variant="outline" onClick={addTeam}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

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
                <Label>Formation</Label>
                <Select 
                  value={currentPeriodState.formation} 
                  onValueChange={(value) => updatePeriodState(currentPeriodKey, { formation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFormations().map((formation) => (
                      <SelectItem key={formation.id} value={formation.id}>
                        {formation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Performance Category</Label>
                <Select 
                  value={currentTeamState.performanceCategoryId} 
                  onValueChange={(value) => updateTeamState(activeTeam, { performanceCategoryId: value })}
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
                  teamId={activeTeam}
                  selectedStaff={currentTeamState.selectedStaff}
                  onStaffChange={(staff) => updateTeamState(activeTeam, { selectedStaff: staff })}
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
