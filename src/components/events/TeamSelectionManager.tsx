import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Bell, CheckCircle, Settings, Plus, Save, Clock, Eye, X } from 'lucide-react';
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
import { formatPlayerName } from '@/utils/nameUtils';
import { NameDisplayOption } from '@/types/team';

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

// Team-level state (includes captain which persists across all periods)
interface TeamState {
  teamId: string;
  selectedStaff: string[];
  performanceCategoryId: string;
  captainId: string; // Back to team level - persists across all periods
}

// Period-specific state (only players and substitutes)
interface PeriodState {
  teamId: string;
  periodId: string;
  formation: string;
  durationMinutes: number;
  selectedPlayers: string[];
  substitutePlayers: string[];
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  event,
  isOpen,
  onClose
}) => {
  // Start with the event's primary team, but allow adding more
  const [teams, setTeams] = useState<string[]>([event.team_id]);
  // Make periods team-specific
  const [teamPeriods, setTeamPeriods] = useState<Record<string, number[]>>({});
  const [activeTeam, setActiveTeam] = useState<string>(event.team_id);
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [performanceCategories, setPerformanceCategories] = useState<PerformanceCategory[]>([]);
  const [availabilityRequested, setAvailabilityRequested] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [nameDisplayOption, setNameDisplayOption] = useState<NameDisplayOption>('surname');
  
  // Team-level states (now includes captain again)
  const [teamStates, setTeamStates] = useState<Record<string, TeamState>>({});

  // Period-specific states (no longer includes captain)
  const [periodStates, setPeriodStates] = useState<Record<string, PeriodState>>({});

  // Staff assignment tracking
  const [staffAssignments, setStaffAssignments] = useState<Record<string, string[]>>({});

  // Get current team's periods
  const currentTeamPeriods = teamPeriods[activeTeam] || [1];

  // Function to get the actual team ID (removing any suffix)
  const getActualTeamId = (teamIdentifier: string): string => {
    return teamIdentifier.split('-team-')[0];
  };

  // Initialize team states when teams change
  useEffect(() => {
    const newTeamStates: Record<string, TeamState> = { ...teamStates };
    const newPeriodStates: Record<string, PeriodState> = { ...periodStates };
    const newTeamPeriods: Record<string, number[]> = { ...teamPeriods };
    
    teams.forEach((teamId, index) => {
      if (!newTeamStates[teamId]) {
        newTeamStates[teamId] = {
          teamId,
          selectedStaff: [],
          performanceCategoryId: 'none',
          captainId: '' // Captain back at team level
        };
      }
      
      // Initialize periods for this team if not already set
      if (!newTeamPeriods[teamId]) {
        newTeamPeriods[teamId] = [1];
      }
      
      // Initialize period states for all periods of this team
      newTeamPeriods[teamId].forEach(period => {
        const periodKey = `${teamId}-${period}`;
        if (!newPeriodStates[periodKey]) {
          newPeriodStates[periodKey] = {
            teamId,
            periodId: period.toString(),
            formation: '4-3-3',
            durationMinutes: 45,
            selectedPlayers: [],
            substitutePlayers: []
          };
        }
      });
    });
    
    setTeamStates(newTeamStates);
    setPeriodStates(newPeriodStates);
    setTeamPeriods(newTeamPeriods);
  }, [teams]);

  // Ensure active team is valid
  useEffect(() => {
    if (!teams.includes(activeTeam)) {
      setActiveTeam(teams[0] || event.team_id);
    }
  }, [teams, activeTeam, event.team_id]);

  // Ensure active period is valid for current team
  useEffect(() => {
    const currentPeriods = teamPeriods[activeTeam] || [1];
    if (!currentPeriods.includes(activePeriod)) {
      setActivePeriod(currentPeriods[0] || 1);
    }
  }, [activeTeam, teamPeriods, activePeriod]);

  useEffect(() => {
    if (isOpen) {
      checkIfAvailabilityRequested();
      loadPerformanceCategories();
      loadExistingSelections();
      loadTeamPlayers();
      loadTeamStaff();
      loadTeamNameDisplaySetting();
    }
  }, [isOpen, event.id]);

  const loadTeamNameDisplaySetting = async () => {
    try {
      const actualTeamId = getActualTeamId(event.team_id);
      const { data, error } = await supabase
        .from('teams')
        .select('name_display_option')
        .eq('id', actualTeamId)
        .single();

      if (error) throw error;
      setNameDisplayOption((data?.name_display_option as NameDisplayOption) || 'surname');
    } catch (error) {
      console.error('Error loading team name display setting:', error);
    }
  };

  const loadTeamPlayers = async () => {
    try {
      const actualTeamId = getActualTeamId(event.team_id);
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', actualTeamId)
        .eq('status', 'active')
        .order('squad_number');

      if (error) throw error;
      setAllPlayers(data || []);
    } catch (error) {
      console.error('Error loading team players:', error);
    }
  };

  const loadTeamStaff = async () => {
    try {
      const actualTeamId = getActualTeamId(event.team_id);
      const { data, error } = await supabase
        .from('team_staff')
        .select('id, name, role')
        .eq('team_id', actualTeamId);

      if (error) throw error;
      setAllStaff(data || []);
    } catch (error) {
      console.error('Error loading team staff:', error);
    }
  };

  const getPlayerSurname = (playerId: string): string => {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return `Player ${playerId}`;
    
    const formattedName = formatPlayerName(player.name, nameDisplayOption);
    return `${formattedName} (#${player.squad_number})`;
  };

  const getStaffName = (staffId: string): string => {
    const staff = allStaff.find(s => s.id === staffId);
    return staff ? staff.name : `Staff ${staffId}`;
  };

  const loadExistingSelections = async () => {
    try {
      console.log('Loading existing selections for event:', event.id);
      const { data: selections, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id);

      if (error) throw error;
      console.log('Found selections:', selections);

      if (selections && selections.length > 0) {
        const newTeamStates: Record<string, TeamState> = {};
        const newPeriodStates: Record<string, PeriodState> = {};
        const newStaffAssignments: Record<string, string[]> = {};
        const newTeamPeriods: Record<string, number[]> = {};
        const teamIds: string[] = [];
        
        // Group selections by performance category to reconstruct teams
        const performanceCategoryGroups: Record<string, any[]> = {};
        
        selections.forEach(selection => {
          const categoryId = selection.performance_category_id || 'none';
          if (!performanceCategoryGroups[categoryId]) {
            performanceCategoryGroups[categoryId] = [];
          }
          performanceCategoryGroups[categoryId].push(selection);
        });

        console.log('Performance category groups:', performanceCategoryGroups);

        // Create team identifiers for each performance category
        Object.keys(performanceCategoryGroups).forEach((categoryId, index) => {
          const categorySelections = performanceCategoryGroups[categoryId];
          let teamId: string;
          
          if (index === 0) {
            // First team uses the primary team ID
            teamId = event.team_id;
          } else {
            // Additional teams get suffixed identifiers
            teamId = `${event.team_id}-team-${index + 1}`;
          }
          
          teamIds.push(teamId);
          console.log('Created team ID:', teamId, 'for category:', categoryId);

          // Initialize periods array for this team
          newTeamPeriods[teamId] = [];

          // Process all selections for this category/team
          categorySelections.forEach(selection => {
            const periodNumber = selection.period_number || 1;
            
            // Add period to team periods array if not already present
            if (!newTeamPeriods[teamId].includes(periodNumber)) {
              newTeamPeriods[teamId].push(periodNumber);
            }

            // Create team state (use first selection's data for team-level info)
            if (!newTeamStates[teamId]) {
              // Safely handle staff_selection JSON
              const staffSelection = Array.isArray(selection.staff_selection) ? selection.staff_selection : [];
              const staffIds = staffSelection
                .map((staff: any) => staff.staffId)
                .filter(Boolean) || [];
              
              newTeamStates[teamId] = {
                teamId,
                selectedStaff: staffIds,
                performanceCategoryId: selection.performance_category_id || 'none',
                captainId: selection.captain_id || '' // Captain stays at team level
              };

              console.log('Created team state for:', teamId, newTeamStates[teamId]);

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

            // Create period-specific state (no captain here anymore)
            const periodKey = `${teamId}-${periodNumber}`;
            
            // Safely handle player_positions JSON for this specific period
            const playerPositions = Array.isArray(selection.player_positions) ? selection.player_positions : [];
            const playerIds = playerPositions
              .map((pos: any) => pos.playerId || pos.player_id)
              .filter(Boolean) || [];
            
            // Safely handle substitutes arrays for this specific period
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
            
            // Only create period state if it doesn't already exist to prevent overwriting
            if (!newPeriodStates[periodKey]) {
              newPeriodStates[periodKey] = {
                teamId,
                periodId: periodNumber.toString(),
                formation: selection.formation || '4-3-3',
                durationMinutes: selection.duration_minutes || 45,
                selectedPlayers: playerIds,
                substitutePlayers: substituteIds
              };
              
              console.log('Created period state for:', periodKey, newPeriodStates[periodKey]);
            }
          });
        });

        // Sort periods for each team
        Object.keys(newTeamPeriods).forEach(teamId => {
          newTeamPeriods[teamId].sort((a, b) => a - b);
        });

        console.log('Final team IDs:', teamIds);
        console.log('Final team states:', newTeamStates);
        console.log('Final team periods:', newTeamPeriods);
        console.log('Final period states:', newPeriodStates);

        setTeams(teamIds.length > 0 ? teamIds : [event.team_id]);
        setTeamPeriods(newTeamPeriods);
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
      const actualTeamId = getActualTeamId(event.team_id);
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', actualTeamId)
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
    selectedStaff: [],
    performanceCategoryId: 'none',
    captainId: '' // Captain at team level
  };

  const currentPeriodKey = `${activeTeam}-${activePeriod}`;
  const currentPeriodState = periodStates[currentPeriodKey] || {
    teamId: activeTeam,
    periodId: activePeriod.toString(),
    formation: '4-3-3',
    durationMinutes: 45,
    selectedPlayers: [],
    substitutePlayers: []
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
    const currentPeriods = teamPeriods[activeTeam] || [1];
    const newPeriod = Math.max(...currentPeriods) + 1;
    
    setTeamPeriods(prev => ({
      ...prev,
      [activeTeam]: [...currentPeriods, newPeriod]
    }));
    
    // Create period state for the new period
    const key = `${activeTeam}-${newPeriod}`;
    const lastPeriodKey = `${activeTeam}-${currentPeriods[currentPeriods.length - 1]}`;
    const lastPeriodState = periodStates[lastPeriodKey];
    
    setPeriodStates(prev => ({
      ...prev,
      [key]: {
        teamId: activeTeam,
        periodId: newPeriod.toString(),
        formation: lastPeriodState?.formation || '4-3-3',
        durationMinutes: lastPeriodState?.durationMinutes || 45,
        selectedPlayers: [],
        substitutePlayers: []
      }
    }));
  };

  const deletePeriod = (periodToDelete: number) => {
    const currentPeriods = teamPeriods[activeTeam] || [1];
    
    // Don't allow deleting the last period
    if (currentPeriods.length <= 1) {
      return;
    }
    
    const updatedPeriods = currentPeriods.filter(period => period !== periodToDelete);
    
    setTeamPeriods(prev => ({
      ...prev,
      [activeTeam]: updatedPeriods
    }));
    
    // Remove the period state
    const keyToDelete = `${activeTeam}-${periodToDelete}`;
    setPeriodStates(prev => {
      const newStates = { ...prev };
      delete newStates[keyToDelete];
      return newStates;
    });
    
    // If the deleted period was active, switch to the first available period
    if (activePeriod === periodToDelete) {
      setActivePeriod(updatedPeriods[0]);
    }
  };

  const deleteTeam = (teamToDelete: string) => {
    // Don't allow deleting the last team
    if (teams.length <= 1) {
      return;
    }
    
    const updatedTeams = teams.filter(team => team !== teamToDelete);
    setTeams(updatedTeams);
    
    // Remove team state
    setTeamStates(prev => {
      const newStates = { ...prev };
      delete newStates[teamToDelete];
      return newStates;
    });
    
    // Remove all period states for this team
    setPeriodStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        if (key.startsWith(`${teamToDelete}-`)) {
          delete newStates[key];
        }
      });
      return newStates;
    });
    
    // Remove team periods
    setTeamPeriods(prev => {
      const newPeriods = { ...prev };
      delete newPeriods[teamToDelete];
      return newPeriods;
    });
    
    // Update staff assignments
    setStaffAssignments(prev => {
      const newAssignments = { ...prev };
      Object.keys(newAssignments).forEach(staffId => {
        newAssignments[staffId] = newAssignments[staffId].filter(id => id !== teamToDelete);
        if (newAssignments[staffId].length === 0) {
          delete newAssignments[staffId];
        }
      });
      return newAssignments;
    });
    
    // If the deleted team was active, switch to the first available team
    if (activeTeam === teamToDelete) {
      setActiveTeam(updatedTeams[0]);
    }
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
    // Get all selected players from all periods across all teams
    const allSelectedPlayers = Object.values(periodStates).flatMap(periodState => 
      periodState.selectedPlayers
    );
    
    // Get all substitutes from all periods across all teams
    const allSubstitutePlayers = Object.values(periodStates).flatMap(periodState => 
      periodState.substitutePlayers
    );
    
    const allSelectedStaff = Object.values(teamStates).flatMap(state => 
      state.selectedStaff
    );

    if (allSelectedPlayers.length === 0 && allSubstitutePlayers.length === 0 && allSelectedStaff.length === 0) {
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
      console.log('Saving selections for teams:', teams);
      console.log('Team states:', teamStates);
      console.log('Period states:', periodStates);

      // Delete existing selections for this event
      await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id);

      const selections = [];
      
      teams.forEach((teamId, teamIndex) => {
        const teamState = teamStates[teamId];
        const teamPeriodsForThisTeam = teamPeriods[teamId] || [1];
        
        if (!teamState) return;

        // Use the actual team ID for database operations
        const actualTeamId = getActualTeamId(teamId);

        teamPeriodsForThisTeam.forEach(period => {
          const periodKey = `${teamId}-${period}`;
          const periodState = periodStates[periodKey];
          if (!periodState) {
            console.warn(`No period state found for ${periodKey}, skipping`);
            return;
          }

          // Create player positions with proper position assignment (not TBD)
          const playerPositions = periodState.selectedPlayers.map((playerId, index) => ({
            playerId,
            player_id: playerId, // Also include player_id for compatibility
            position: getPositionForPlayer(periodState.formation, index), // Assign actual position
            isSubstitute: false
          }));

          // Add substitute players to positions array with isSubstitute flag
          const substitutePositions = periodState.substitutePlayers.map(playerId => ({
            playerId,
            player_id: playerId,
            position: 'SUB',
            isSubstitute: true
          }));

          // Combine regular and substitute positions
          const allPlayerPositions = [...playerPositions, ...substitutePositions];

          const staffSelection = teamState.selectedStaff.map(staffId => ({
            staffId
          }));

          const selection = {
            event_id: event.id,
            team_id: actualTeamId,
            team_number: teamIndex + 1,
            period_number: period,
            formation: periodState.formation,
            player_positions: allPlayerPositions,
            substitutes: periodState.substitutePlayers,
            substitute_players: periodState.substitutePlayers,
            captain_id: teamState.captainId || null, // Captain from team level
            staff_selection: staffSelection,
            performance_category_id: teamState.performanceCategoryId !== 'none' ? teamState.performanceCategoryId : null,
            duration_minutes: periodState.durationMinutes
          };

          console.log('Adding selection for period:', period, 'with players:', periodState.selectedPlayers, 'substitutes:', periodState.substitutePlayers, 'captain:', teamState.captainId);
          selections.push(selection);
        });
      });

      console.log('Final selections to save:', selections);

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
    
    // Create a simple pitch layout with GK at the bottom
    const rows = [];
    let playerIndex = 0;
    
    // Group positions by typical rows for display - GK at bottom, then defenders, midfield, attack at top
    const positionRows = {
      'Attack': positions.filter(pos => pos.startsWith('ST') || pos.startsWith('F')),
      'Midfield': positions.filter(pos => pos.startsWith('M') || pos.startsWith('AM')),
      'Defence': positions.filter(pos => pos.startsWith('D')),
      'GK': ['GK']
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
              {substitutes.map(playerId => {
                const isCaptain = playerId === captainId;
                return (
                  <Badge key={playerId} variant="outline" className="text-xs">
                    {getPlayerSurname(playerId)}
                    {isCaptain && <span className="text-yellow-600"> (C)</span>}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFormationOverview = () => {
    const teamState = teamStates[activeTeam];
    const teamPeriodsForThisTeam = teamPeriods[activeTeam] || [1];
    
    if (!teamState) return null;

    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">{getTeamDisplayName(activeTeam)} - Formation Overview</h3>
          <p className="text-sm text-muted-foreground">Complete lineup and formation details for all periods</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamPeriodsForThisTeam.map(period => {
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
                    periodState.selectedPlayers,
                    periodState.substitutePlayers,
                    teamState.captainId, // Captain from team level
                    periodState.durationMinutes
                  )}
                  
                  {teamState.selectedStaff.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <Label className="text-xs font-medium">Staff ({teamState.selectedStaff.length})</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {teamState.selectedStaff.map(staffId => (
                          <Badge key={staffId} variant="outline" className="text-xs">
                            {getStaffName(staffId)}
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
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-6">
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
                <div key={teamId} className="flex items-center">
                  <Button
                    variant={teamId === activeTeam ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTeam(teamId)}
                    className={teamId === activeTeam ? "bg-white shadow-sm text-gray-900" : "text-gray-700 hover:text-gray-900"}
                  >
                    {getTeamDisplayName(teamId)}
                  </Button>
                  {teams.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTeam(teamId)}
                      className="ml-1 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Period Selection and Duration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentTeamPeriods.map((period) => (
                  <div key={period} className="flex items-center">
                    <Button
                      variant={period === activePeriod ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActivePeriod(period)}
                    >
                      Period {period}
                    </Button>
                    {currentTeamPeriods.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePeriod(period)}
                        className="ml-1 h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
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
            <Tabs defaultValue="players" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="players">Player Selection</TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Formation Overview
                </TabsTrigger>
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="players" className="space-y-4">
                <PlayerSelectionWithAvailability
                  teamId={getActualTeamId(activeTeam)}
                  eventId={event.id}
                  selectedPlayers={currentPeriodState.selectedPlayers}
                  substitutePlayers={currentPeriodState.substitutePlayers}
                  captainId={currentTeamState.captainId} // Captain from team level
                  onPlayersChange={(players) => updatePeriodState(currentPeriodKey, { selectedPlayers: players })}
                  onSubstitutesChange={(substitutes) => updatePeriodState(currentPeriodKey, { substitutePlayers: substitutes })}
                  onCaptainChange={(captainId) => updateTeamState(activeTeam, { captainId })} // Update team-level captain
                  eventType={event.event_type}
                  formation={currentPeriodState.formation}
                  onFormationChange={(formation) => updatePeriodState(currentPeriodKey, { formation })}
                  gameFormat={event.game_format as GameFormat}
                  teamNumber={teams.indexOf(activeTeam) + 1}
                  periodNumber={activePeriod}
                />

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium">Selection Summary</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentPeriodState.selectedPlayers.length} players, {currentPeriodState.substitutePlayers.length} substitutes selected for Period {activePeriod}
                          {currentTeamState.captainId && (
                            <span> • Captain: {getPlayerSurname(currentTeamState.captainId)} (all periods)</span>
                          )}
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

              <TabsContent value="overview">
                {renderFormationOverview()}
              </TabsContent>

              <TabsContent value="staff">
                <StaffSelectionSection
                  teamId={getActualTeamId(activeTeam)}
                  selectedStaff={currentTeamState.selectedStaff}
                  onStaffChange={(staff) => updateTeamState(activeTeam, { selectedStaff: staff })}
                  staffAssignments={staffAssignments}
                />
              </TabsContent>

              <TabsContent value="availability">
                <EventAvailabilityDashboard event={event} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const getPositionForPlayer = (formation: string, playerIndex: number): string => {
  const positions = getFormationPositions(formation);
  return positions[playerIndex] || 'TBD';
};

const getFormationPositions = (formation: string): string[] => {
  switch (formation) {
    case '4-3-3':
      return ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
    case '4-4-2':
      return ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'];
    case '3-5-2':
      return ['GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'LWB', 'ST', 'ST'];
    case '4-2-3-1':
      return ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST'];
    case '3-4-3':
      return ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'];
    default:
      return ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
  }
};
