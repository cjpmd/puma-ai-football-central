
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Users, Gamepad2, Target, Plus, X, FileText, Loader2, UserPlus, Lock, Unlock, Clipboard, Sparkles } from 'lucide-react';
import { GameDayStyleFormationEditor } from './GameDayStyleFormationEditor';
import { MatchDayPackView } from './MatchDayPackView';
import { TrainingPlanEditor } from './TrainingPlanEditor';
import { SquadPlayer, FormationPeriod, TeamSelectionState } from '@/types/teamSelection';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { AvailabilityDrivenSquadManagement } from './AvailabilityDrivenSquadManagement';
import { getFormationsByFormat } from '@/utils/formationUtils';
import { EventStaffAssignmentSection } from './EventStaffAssignmentSection';
import { StaffAccountLinkingModal } from '@/components/teams/StaffAccountLinkingModal';
import { AITeamBuilderDialog } from './AITeamBuilderDialog';

// Helper function to create a default period with the first available formation
const createDefaultPeriod = (gameFormat: string, gameDuration: number = 50): FormationPeriod => {
  const formations = getFormationsByFormat(gameFormat as any);
  const defaultFormation = formations[0]?.id || '4-3-3';
  
  return {
    id: 'period-1',
    periodNumber: 1,
    formation: defaultFormation,
    duration: gameDuration,
    positions: [], // Will be populated by DragDropFormationEditor
    substitutes: [],
    captainId: undefined
  };
};

interface TeamSelection {
  teamNumber: number;
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  globalCaptainId?: string;
  performanceCategory?: string;
  isPositionsLocked?: boolean;
  selectedStaff?: string[];
}

interface EnhancedTeamSelectionManagerProps {
  event: DatabaseEvent;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedTeamSelectionManager: React.FC<EnhancedTeamSelectionManagerProps> = ({
  event,
  teamId: propTeamId,
  isOpen,
  onClose
}) => {
  const { user } = useAuth();
  const isMobile = useMobileDetection();
  const teamId = propTeamId || event.team_id;
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('squad');
  const [showMatchDayPack, setShowMatchDayPack] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [staffLinksRefresh, setStaffLinksRefresh] = useState(0);
  const [hasAutoSyncedFormation, setHasAutoSyncedFormation] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Helper function to extract staff IDs from staff_selection
  const extractStaffIds = (staffSelection: any[]): string[] => {
    if (!Array.isArray(staffSelection)) return [];
    return staffSelection.map(staff => staff.staffId || staff.id).filter(Boolean);
  };

  // Load performance categories for the team
  const { data: performanceCategories = [] } = useQuery({
    queryKey: ['performance-categories', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_categories')
        .select('*')
        .eq('team_id', teamId)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });

  // Load team name display option
const { data: teamData } = useQuery({
  queryKey: ['team-settings', teamId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('name, name_display_option')
      .eq('id', teamId)
      .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Initialize teams and load existing data
  useEffect(() => {
    if (!isOpen) return;

    const initializeData = async () => {
      console.log('Initializing team selection data...');
      
      // Determine number of teams from event data
      let teamCount = 1;
      if (event.teams && Array.isArray(event.teams)) {
        teamCount = Math.max(event.teams.length, 1);
      } else if (event.teams && typeof event.teams === 'string') {
        try {
          const parsedTeams = JSON.parse(event.teams);
          if (Array.isArray(parsedTeams)) {
            teamCount = Math.max(parsedTeams.length, 1);
          }
        } catch (e) {
          console.warn('Could not parse teams data:', event.teams);
        }
      }

      // Create initial team selections structure
      const initialTeamSelections: TeamSelection[] = [];
      for (let i = 0; i < teamCount; i++) {
        initialTeamSelections.push({
          teamNumber: i + 1,
          squadPlayers: [],
          periods: [],
          globalCaptainId: undefined,
          performanceCategory: 'none',
          selectedStaff: []
        });
      }

      // Load existing selections from database
      try {
        const { data: existingSelections, error } = await supabase
          .from('event_selections')
          .select(`
            *,
            performance_categories (
              id,
              name
            )
          `)
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .order('team_number', { ascending: true })
          .order('period_number', { ascending: true });

        if (error) throw error;

        console.log('Loaded existing selections:', existingSelections);

        if (existingSelections && existingSelections.length > 0) {
          // Group selections by team number
          const groupedSelections = existingSelections.reduce((acc, selection) => {
            const teamNum = selection.team_number || 1;
            if (!acc[teamNum]) acc[teamNum] = [];
            acc[teamNum].push(selection);
            return acc;
          }, {} as Record<number, any[]>);

          // Helper function to determine position group
          const getPositionGroup = (positionName: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
            const pos = positionName?.toLowerCase() || '';
            
            if (pos.includes('goalkeeper') || pos === 'gk' || pos === 'g') {
              return 'goalkeeper';
            } else if (pos.includes('defender') || pos.includes('defence') || pos.startsWith('d')) {
              return 'defender';
            } else if (pos.includes('midfielder') || pos.includes('mid') || pos.startsWith('m') || pos.includes('cam') || pos.includes('cdm')) {
              return 'midfielder';
            } else {
              return 'forward';
            }
          };

          // Update team selections with existing data
          for (const [teamNum, selections] of Object.entries(groupedSelections)) {
            const teamIndex = parseInt(teamNum) - 1;
            if (teamIndex >= 0 && teamIndex < initialTeamSelections.length) {
              const periods: FormationPeriod[] = selections.map(selection => {
                // First, create all position slots from the formation template
                const formations = getFormationsByFormat(event.game_format as any);
                const formationConfig = formations.find(f => f.id === selection.formation);
                
                let positions: any[] = [];
                
                if (formationConfig) {
                  // Create full template positions with correct coordinates
                  positions = formationConfig.positions.map((pos, index) => ({
                    id: `position-${index}`,
                    positionName: pos.position,
                    abbreviation: pos.position?.substring(0, 2) || '',
                    positionGroup: getPositionGroup(pos.position),
                    x: pos.x,
                    y: pos.y,
                    playerId: undefined
                  }));
                  
                  // Then overlay saved player assignments
                  if (selection.player_positions && Array.isArray(selection.player_positions)) {
                    selection.player_positions.forEach((savedPos: any) => {
                      // Find matching template position by name
                      const matchingIndex = positions.findIndex(
                        p => p.positionName === savedPos.position
                      );
                      
                      if (matchingIndex >= 0) {
                        positions[matchingIndex] = {
                          ...positions[matchingIndex],
                          playerId: savedPos.playerId || savedPos.player_id,
                          abbreviation: savedPos.abbreviation || positions[matchingIndex].abbreviation
                        };
                      }
                    });
                  }
                } else {
                  // Fallback: use saved positions if formation not found
                  positions = (selection.player_positions || []).map((pos: any, index: number) => ({
                    id: `position-${index}`,
                    positionName: pos.position,
                    abbreviation: pos.abbreviation || pos.position?.substring(0, 2) || '',
                    positionGroup: getPositionGroup(pos.position),
                    x: pos.x || 50,
                    y: pos.y || 50,
                    playerId: pos.playerId || pos.player_id
                  }));
                }
                
                return {
                  id: `period-${selection.period_number}`,
                  periodNumber: selection.period_number,
                  formation: selection.formation,
                  duration: selection.duration_minutes,
                  positions,
                  substitutes: selection.substitute_players || [],
                  captainId: selection.captain_id || undefined
                };
              });

              initialTeamSelections[teamIndex] = {
                ...initialTeamSelections[teamIndex],
                periods,
                globalCaptainId: periods[0]?.captainId,
                performanceCategory: selections[0]?.performance_category_id || 'none',
                selectedStaff: extractStaffIds(selections[0]?.staff_selection) || []
              };
            }
          }
        }

        // Ensure teams without periods get a default period with the first formation
        for (let i = 0; i < initialTeamSelections.length; i++) {
          if (initialTeamSelections[i].periods.length === 0) {
            const defaultPeriod = createDefaultPeriod(
              event.game_format || '7-a-side', 
              event.game_duration || 50
            );
            initialTeamSelections[i].periods = [defaultPeriod];
          }
        }

        console.log('Final initialized team selections:', initialTeamSelections);
        setTeamSelections(initialTeamSelections);
      } catch (error) {
        console.error('Error loading existing selections:', error);
        toast.error('Failed to load existing team selections');
        setTeamSelections(initialTeamSelections);
      }
    };

    initializeData();
  }, [isOpen, event.id, teamId]);

  // Subscribe to availability changes for real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_availability',
          filter: `event_id=eq.${event.id}`
        },
        (payload) => {
          console.log('Availability changed, reloading selections');
          // Trigger a reload of team selections
          const initializeData = async () => {
            try {
              const { data: existingSelections, error } = await supabase
                .from('event_selections')
                .select('*')
                .eq('event_id', event.id)
                .eq('team_id', teamId)
                .order('team_number', { ascending: true })
                .order('period_number', { ascending: true });

              if (error) throw error;

              if (existingSelections && existingSelections.length > 0) {
                // Re-process the selections similar to initial load
                window.location.reload(); // Simple reload for now
              }
            } catch (error) {
              console.error('Error reloading after availability change:', error);
            }
          };
          initializeData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, event.id, teamId]);

  // Auto-sync formation coordinates when formation tab opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'formation' || hasAutoSyncedFormation) return;
    if (teamSelections.length === 0) return;
    
    const currentTeam = teamSelections[currentTeamIndex];
    if (!currentTeam || currentTeam.periods.length === 0) return;
    
    console.log('Auto-syncing formation layouts on tab open');
    
    // Helper function for consistent position abbreviations
    const getPositionAbbreviation = (positionName: string): string => {
      const positionMap: Record<string, string> = {
        'Goalkeeper': 'GK',
        'Defender Left': 'DL',
        'Defender Centre': 'DC',
        'Defender Right': 'DR',
        'Defender Centre Left': 'DCL',
        'Defender Centre Right': 'DCR',
        'Midfielder Left': 'ML',
        'Midfielder Centre': 'MC',
        'Midfielder Right': 'MR',
        'Midfielder Centre Left': 'MCL',
        'Midfielder Centre Right': 'MCR',
        'Midfielder Defensive': 'DM',
        'Midfielder Attacking': 'AM',
        'Midfielder Attacking Left': 'AML',
        'Midfielder Attacking Right': 'AMR',
        'Midfielder Attacking Centre': 'AMC',
        'Striker Left': 'STL',
        'Striker Centre': 'STC',
        'Striker Right': 'STR',
        'Forward Left': 'FL',
        'Forward Centre': 'FC',
        'Forward Right': 'FR',
        'Wing Left': 'LW',
        'Wing Right': 'RW',
        'Winger Left': 'LW',
        'Winger Right': 'RW',
      };
      return positionMap[positionName] || positionName.slice(0, 3).toUpperCase();
    };

    // Helper to create position slots from formation
    const createPositionSlots = (formationId: string): any[] => {
      const formations = getFormationsByFormat(event.game_format as any);
      const formation = formations.find(f => f.id === formationId);
      if (!formation) return [];
      
      return formation.positions.map((pos, index) => ({
        id: `position-${index}`,
        positionName: pos.position,
        abbreviation: getPositionAbbreviation(pos.position),
        positionGroup: pos.position.toLowerCase().includes('goalkeeper') ? 'goalkeeper' :
                       pos.position.toLowerCase().includes('def') ? 'defender' :
                       pos.position.toLowerCase().includes('mid') ? 'midfielder' : 'forward',
        x: pos.x,
        y: pos.y,
        playerId: undefined
      }));
    };
    
    let needsUpdate = false;
    const updatedPeriods = currentTeam.periods.map(period => {
      const templatePositions = createPositionSlots(period.formation);
      
      // Check if update is needed
      const positionsNeedUpdate = period.positions.some((pos, idx) => {
        const template = templatePositions[idx];
        return template && (
          Math.abs(pos.x - template.x) > 0.1 ||
          Math.abs(pos.y - template.y) > 0.1
        );
      });
      
      if (!positionsNeedUpdate) return period;
      
      needsUpdate = true;
      
      // Sync positions while preserving player assignments
      const syncedPositions = period.positions.map((pos, idx) => {
        const template = templatePositions[idx];
        if (!template) return pos;
        
        return {
          ...pos,
          x: template.x,
          y: template.y,
          abbreviation: template.abbreviation,
          positionGroup: template.positionGroup,
          positionName: template.positionName
        };
      });
      
      return {
        ...period,
        positions: syncedPositions
      };
    });
    
    if (needsUpdate) {
      console.log('Applied auto-sync to formation coordinates');
      updateCurrentTeam({ periods: updatedPeriods });
    }
    
    setHasAutoSyncedFormation(true);
  }, [isOpen, activeTab, hasAutoSyncedFormation, currentTeamIndex, teamSelections, event.game_format]);

  const addTeam = async () => {
    const newTeamNumber = teamSelections.length + 1;
    const defaultPeriod = createDefaultPeriod(
      event.game_format || '7-a-side', 
      event.game_duration || 50
    );
    
    const newTeam: TeamSelection = {
      teamNumber: newTeamNumber,
          squadPlayers: [],
          periods: [defaultPeriod],
          globalCaptainId: undefined,
          performanceCategory: 'none',
          isPositionsLocked: false,
      selectedStaff: []
    };
    
    console.log('Adding new team:', newTeam);
    
    try {
      // First update the event's teams data
      const { error: updateEventError } = await supabase
        .from('events')
        .update({ 
          teams: [...teamSelections.map(t => t.teamNumber.toString()), newTeamNumber.toString()]
        })
        .eq('id', event.id);

      if (updateEventError) {
        console.error('Error updating event teams:', updateEventError);
        throw updateEventError;
      }

      // Create initial event_selection record for the new team
      const { data: insertedSelection, error: selectionError } = await supabase
        .from('event_selections')
        .insert({
          event_id: event.id,
          team_id: teamId,
          team_number: newTeamNumber,
          period_number: 1,
          formation: '4-3-3',
          duration_minutes: event.game_duration || 90,
          player_positions: [],
          substitute_players: [],
          staff_selection: [],
          performance_category_id: null
        })
        .select()
        .single();

      if (selectionError) {
        console.error('Error creating initial selection record:', selectionError);
        throw selectionError;
      }

      console.log('Successfully saved new team to database:', insertedSelection);
      
      // Update local state
      const updatedTeamSelections = [...teamSelections, newTeam];
      setTeamSelections(updatedTeamSelections);
      setCurrentTeamIndex(teamSelections.length);
      setActiveTab('squad');
      
      toast.success('New team added and saved successfully');
    } catch (error) {
      console.error('Error saving new team:', error);
      toast.error('Failed to save new team');
    }
  };

  const deleteTeam = async (teamIndex: number) => {
    if (teamSelections.length <= 1) {
      toast.error('Cannot delete the last remaining team');
      return;
    }

    const teamToDelete = teamSelections[teamIndex];
    if (!teamToDelete) return;

    console.log('Deleting team:', teamToDelete.teamNumber);
    
    try {
      // Delete from database
      const { error: deleteError } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', teamId)
        .eq('team_number', teamToDelete.teamNumber);

      if (deleteError) {
        console.error('Error deleting team from database:', deleteError);
        throw deleteError;
      }

      // Update local state
      const updatedTeamSelections = teamSelections.filter((_, index) => index !== teamIndex);
      
      // Renumber teams to maintain sequential order
      const renumberedTeams = updatedTeamSelections.map((team, index) => ({
        ...team,
        teamNumber: index + 1
      }));

      setTeamSelections(renumberedTeams);
      
      // Adjust current team index if necessary
      if (currentTeamIndex >= teamIndex) {
        setCurrentTeamIndex(Math.max(0, currentTeamIndex - 1));
      }

      // Update event's teams data
      const { error: updateEventError } = await supabase
        .from('events')
        .update({ 
          teams: renumberedTeams.map(team => team.teamNumber.toString())
        })
        .eq('id', event.id);

      if (updateEventError) {
        console.error('Error updating event teams:', updateEventError);
      }
      
      toast.success('Team deleted successfully');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const isTrainingEvent = event?.event_type === 'training';

  const getCurrentTeam = (): TeamSelection | null => {
    return teamSelections[currentTeamIndex] || null;
  };

  const handleTogglePositionsLock = () => {
    const currentTeam = getCurrentTeam();
    if (!currentTeam) return;
    
    const newLockedState = !currentTeam.isPositionsLocked;
    updateCurrentTeam({ isPositionsLocked: newLockedState });
    toast.success(newLockedState ? 'Player positions locked' : 'Player positions unlocked');
  };

  const updateCurrentTeam = (updates: Partial<TeamSelection>) => {
    setTeamSelections(prevSelections => {
      const updatedSelections = prevSelections.map((team, index) => 
        index === currentTeamIndex ? { ...team, ...updates } : team
      );
      console.log('Updated current team:', updatedSelections[currentTeamIndex]);
      return updatedSelections;
    });
  };

  const handlePeriodsChange = (periods: FormationPeriod[]) => {
    updateCurrentTeam({ periods });
  };

  const handleCaptainChange = (captainId: string) => {
    const actualCaptainId = captainId === 'no-captain' ? undefined : captainId;
    
    const updatedPeriods = getCurrentTeam()?.periods.map(period => ({
      ...period,
      captainId: actualCaptainId
    })) || [];
    
    updateCurrentTeam({ 
      globalCaptainId: actualCaptainId,
      periods: updatedPeriods
    });
  };

  const handleSquadChange = (newSquadPlayers: SquadPlayer[]) => {
    console.log('Squad changed for team', currentTeamIndex + 1, ':', newSquadPlayers);
    
    // Get current periods or create default if none exist
    const existingPeriods = currentTeam?.periods || [];
    const updatedPeriods = existingPeriods.length > 0 ? [...existingPeriods] : [];
    
    // Ensure Period 1 exists
    if (updatedPeriods.length === 0) {
      updatedPeriods.push(createDefaultPeriod(event.game_format || '11-a-side', event.game_duration));
    }
    
    // Get all player IDs currently assigned to positions or substitutes across all periods
    const assignedPlayerIds = new Set<string>();
    updatedPeriods.forEach(period => {
      period.positions.forEach(pos => {
        if (pos.playerId) assignedPlayerIds.add(pos.playerId);
      });
      period.substitutes.forEach(subId => assignedPlayerIds.add(subId));
    });
    
    // Add unassigned players to Period 1's substitutes
    const period1 = updatedPeriods[0];
    const unassignedPlayers = newSquadPlayers
      .filter(player => !assignedPlayerIds.has(player.id))
      .map(player => player.id);
    
    if (unassignedPlayers.length > 0) {
      period1.substitutes = [...period1.substitutes, ...unassignedPlayers];
    }
    
    updateCurrentTeam({ 
      squadPlayers: newSquadPlayers,
      periods: updatedPeriods
    });
  };

  const handleStaffChange = (staffIds: string[]) => {
    console.log('Staff changed for team', currentTeamIndex + 1, ':', staffIds);
    updateCurrentTeam({ selectedStaff: staffIds });
  };

  const handlePerformanceCategoryChange = async (categoryId: string) => {
    const actualCategoryId = categoryId === 'none' ? null : categoryId;
    const teamNumber = currentTeamIndex + 1;
    
    // Update local state immediately (optimistic update)
    updateCurrentTeam({ performanceCategory: categoryId });
    
    console.log('Saving performance category:', { 
      categoryId: actualCategoryId, 
      teamId, 
      eventId: event.id, 
      teamNumber 
    });
    
      try {
        // Ensure event_selection record exists first
        const { data: existingSelections, error: checkError } = await supabase
          .from('event_selections')
          .select('id')
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .eq('team_number', teamNumber);

        if (checkError) {
          console.error('Error checking existing selection:', checkError);
          throw checkError;
        }

        const existingSelection = Array.isArray(existingSelections)
          ? existingSelections[0]
          : existingSelections || null;

        if (existingSelection) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('event_selections')
          .update({ 
            performance_category_id: actualCategoryId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSelection.id);

        if (updateError) {
          console.error('Error updating performance category:', updateError);
          throw updateError;
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('event_selections')
          .insert({
            event_id: event.id,
            team_id: teamId,
            team_number: teamNumber,
            period_number: 1,
            formation: '4-3-3',
            duration_minutes: event.game_duration || 90,
            player_positions: [],
            substitute_players: [],
            staff_selection: [],
            performance_category_id: actualCategoryId
          });

        if (insertError) {
          console.error('Error creating new selection:', insertError);
          throw insertError;
        }
      }

      const categoryName = actualCategoryId 
        ? performanceCategories.find(c => c.id === actualCategoryId)?.name || 'Unknown'
        : 'None';
      toast.success(`Performance category saved: ${categoryName}`);
      
    } catch (error: any) {
      console.error('Error saving performance category:', error);
      toast.error(`Failed to save performance category: ${error.message}`);
      
      // Revert local state on error
      updateCurrentTeam({ performanceCategory: 'none' });
    }
  };

  const handleApplyAISelection = (periods: FormationPeriod[], captainId?: string, reasoning?: string) => {
    console.log('Applying AI selection:', { periods, captainId, reasoning });
    updateCurrentTeam({ 
      periods,
      globalCaptainId: captainId
    });
    if (reasoning) {
      toast.success(reasoning);
    }
  };

  const saveSelections = async () => {
    if (teamSelections.length === 0) {
      toast.error('Please create at least one team before saving');
      return;
    }

    console.log('Saving team selections:', teamSelections);
    setSaving(true);
    
    try {
      // Delete existing selections for this event
      const { error: deleteError } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', teamId);

      if (deleteError) throw deleteError;

      // Create new selections for each team
      const selectionsToInsert = [];
      
      for (const team of teamSelections) {
        console.log(`Processing team ${team.teamNumber} with ${team.periods.length} periods and ${team.squadPlayers.length} squad players`);
        
        // Create a default period if no periods exist but squad players are present
        const periodsToSave = team.periods.length > 0 ? team.periods : 
          team.squadPlayers.length > 0 ? [{
            id: `period-1`,
            periodNumber: 1,
            formation: '4-3-3',
            duration: event.game_duration || 90,
            positions: [],
            substitutes: [],
            captainId: team.globalCaptainId
          }] : [];

        for (const period of periodsToSave) {
          const playerPositions = period.positions
            .filter(pos => pos.playerId)
            .map(pos => ({
              playerId: pos.playerId,
              player_id: pos.playerId,
              position: pos.positionName,
              abbreviation: pos.abbreviation,
              positionGroup: pos.positionGroup,
              x: pos.x,
              y: pos.y,
              isSubstitute: false,
              minutes: period.duration
            }));

          selectionsToInsert.push({
            event_id: event.id,
            team_id: teamId,
            team_number: team.teamNumber,
            period_number: period.periodNumber,
            formation: period.formation,
            duration_minutes: period.duration,
            captain_id: team.globalCaptainId || null,
            performance_category_id: team.performanceCategory === 'none' ? null : team.performanceCategory,
            player_positions: playerPositions,
            substitute_players: period.substitutes,
            staff_selection: (team.selectedStaff || []).map(staffId => ({ staffId }))
          });
        }
      }

      if (selectionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('event_selections')
          .insert(selectionsToInsert);

        if (insertError) throw insertError;
      }

      // Update the event's teams data
      const { error: updateEventError } = await supabase
        .from('events')
        .update({ 
          teams: teamSelections.map(team => team.teamNumber.toString())
        })
        .eq('id', event.id);

      if (updateEventError) {
        console.error('Error updating event teams:', updateEventError);
      }

      toast.success('Team selections saved successfully!');
      
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save team selections');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyTeams = async () => {
    try {
      let copyText = `${event.title}\n`;
      copyText += `${event.date}\n\n`;

      teamSelections.forEach((team) => {
        const captainPlayer = team.squadPlayers.find(p => p.id === team.globalCaptainId);
        const captainText = captainPlayer 
          ? `(Captain: ${captainPlayer.name} #${captainPlayer.squadNumber})`
          : '';

        copyText += `Team ${team.teamNumber} ${captainText}\n`;
        
        team.squadPlayers.forEach((player, index) => {
          copyText += `${index + 1}. ${player.name} (#${player.squadNumber})\n`;
        });
        
        copyText += `\n`;
      });

      await navigator.clipboard.writeText(copyText);
      toast.success('Team lists copied to clipboard!');
    } catch (error) {
      console.error('Error copying teams:', error);
      toast.error('Failed to copy team lists');
    }
  };

  const currentTeam = getCurrentTeam();
  const nameDisplayOption = teamData?.name_display_option || 'surname';

return (
  <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-6xl xl:max-w-7xl w-full max-w-[95vw] max-h-[92vh] overflow-hidden p-0 ${isMobile ? '[&>button]:hidden' : ''}`}>
        <div className={`${isMobile ? 'h-[calc(100dvh-56px)]' : 'h-[88vh]'} flex flex-col bg-background rounded-xl min-h-0 w-full max-w-full overflow-hidden`}>
          {/* Compact Header - 2 Rows */}
          <div className={`border-b ${isMobile ? 'px-3 py-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]' : 'px-4 py-3'} space-y-2`}>
            {/* Row 1: Teams Only + Close Button on far right */}
            <div className="flex items-center gap-2">
              {/* Team Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {teamSelections.map((team, index) => (
                  <Button
                    key={team.teamNumber}
                    variant={index === currentTeamIndex ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCurrentTeamIndex(index);
                      setActiveTab('squad');
                    }}
                    className={`${isMobile ? 'h-10 text-sm px-3 min-w-[44px]' : 'h-7 text-xs px-2'}`}
                  >
                    {isTrainingEvent ? 'G' : 'T'}{team.teamNumber}
                    {team.squadPlayers.length > 0 && (
                      <span className={`ml-1 opacity-70 ${isMobile ? 'text-xs' : 'text-[10px]'}`}>({team.squadPlayers.length})</span>
                    )}
                  </Button>
                ))}
                {/* Add/Remove team buttons - desktop only */}
                {!isMobile && (
                  <>
                    <Button onClick={addTeam} variant="outline" size="sm" className="h-7 px-2">
                      <Plus className="h-3 w-3" />
                    </Button>
                    {teamSelections.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTeam(currentTeamIndex)}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Close Button - far right */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`${isMobile ? 'h-10 w-10' : 'h-7 w-7'} p-0 shrink-0`}
              >
                <X className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
            </div>

            {/* Row 2: AI, Lock, Category, Save */}
            <div className="flex items-center gap-2">
              {activeTab === 'formation' && !isTrainingEvent && currentTeam && currentTeam.squadPlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIBuilder(true)}
                  className={`${isMobile ? 'h-9 w-9 p-0' : 'h-7 px-2'}`}
                  title="AI Builder"
                >
                  <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                </Button>
              )}

              {activeTab === 'formation' && currentTeam && currentTeam.squadPlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePositionsLock}
                  className={`${isMobile ? 'h-9 w-9 p-0' : 'h-7 px-2'} ${
                    currentTeam.isPositionsLocked 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}
                  title={currentTeam.isPositionsLocked ? 'Unlock' : 'Lock'}
                >
                  {currentTeam.isPositionsLocked 
                    ? <Lock className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} /> 
                    : <Unlock className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />}
                </Button>
              )}

              {/* Category Selector */}
              {performanceCategories.length > 0 && currentTeam && (
                <Select 
                  value={currentTeam.performanceCategory || 'none'} 
                  onValueChange={handlePerformanceCategoryChange}
                >
                  <SelectTrigger className={`${isMobile ? 'h-9 w-32 text-sm' : 'h-7 w-28 text-xs'}`}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {performanceCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {!isMobile && (
                  <>
                    <Button onClick={handleCopyTeams} variant="outline" size="sm" className="h-7 px-2">
                      <Clipboard className="h-3 w-3" />
                    </Button>
                    <Button onClick={() => setShowMatchDayPack(true)} variant="outline" size="sm" className="h-7 px-2">
                      <FileText className="h-3 w-3" />
                    </Button>
                  </>
                )}
                
                <Button onClick={saveSelections} disabled={saving} size="sm" className={`${isMobile ? 'h-9 px-4' : 'h-7 px-3'}`}>
                  {saving ? <Loader2 className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} animate-spin`} /> : <Save className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />}
                  <span className={`ml-1 ${isMobile ? 'text-sm' : 'text-xs'}`}>Save</span>
                </Button>
              </div>
            </div>
          </div>

        <div className="flex-1 min-h-0 overflow-hidden w-full max-w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full min-h-0 flex flex-col w-full max-w-full">
            <div className={`${isMobile ? 'p-2' : 'p-6'} flex-shrink-0 w-full max-w-full`}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="squad" className={`flex items-center gap-1 ${isMobile ? 'text-xs' : ''}`}>
                  <Users className="h-3 w-3" />
                  Squad
                </TabsTrigger>
                <TabsTrigger value="staff" className={`flex items-center gap-1 ${isMobile ? 'text-xs' : ''}`}>
                  <UserPlus className="h-3 w-3" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value={isTrainingEvent ? "training-plan" : "formation"} className={`flex items-center gap-1 ${isMobile ? 'text-xs' : ''}`}>
                  <Gamepad2 className="h-3 w-3" />
                  {isTrainingEvent ? "Training Plan" : "Formation"}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className={`flex-1 min-h-0 px-2 pb-2 w-full max-w-full ${activeTab === 'formation' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
              <TabsContent value="squad" className="mt-0 h-auto data-[state=active]:block data-[state=inactive]:hidden" style={{ height: 'auto' }}>
                {currentTeam && (
                  <AvailabilityDrivenSquadManagement
                    key={`team-${currentTeamIndex}`}
                    teamId={teamId}
                    eventId={event.id}
                    globalCaptainId={currentTeam.globalCaptainId}
                    onSquadChange={handleSquadChange}
                    onCaptainChange={(captainId) => {
                      const actualCaptainId = captainId === '' ? undefined : captainId;
                      handleCaptainChange(actualCaptainId || 'no-captain');
                    }}
                    allTeamSelections={teamSelections}
                    currentTeamIndex={currentTeamIndex}
                    eventType={event.event_type}
                  />
                )}
              </TabsContent>

              <TabsContent value="staff" className="mt-0 h-auto data-[state=active]:block data-[state=inactive]:hidden" style={{ height: 'auto' }}>
                {currentTeam && (
                  <EventStaffAssignmentSection
                    eventId={event.id}
                    teamId={teamId}
                    selectedStaff={currentTeam.selectedStaff || []}
                    onStaffChange={handleStaffChange}
                    refreshToken={staffLinksRefresh}
                  />
                )}
              </TabsContent>

              {isTrainingEvent ? (
                <TabsContent value="training-plan" className="mt-0 h-auto data-[state=active]:block data-[state=inactive]:hidden" style={{ height: 'auto' }}>
                  {currentTeam && (
                    <TrainingPlanEditor
                      teamId={teamId}
                      eventId={event.id}
                      squadPlayers={currentTeam.squadPlayers}
                      teamNumber={currentTeam.teamNumber}
                      performanceCategoryId={currentTeam.performanceCategory}
                    />
                  )}
                </TabsContent>
              ) : (
                <TabsContent value="formation" className="mt-0 h-full data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden overflow-hidden">
                  {!currentTeam || currentTeam.squadPlayers.length === 0 ? (
                    <Card>
                      <CardContent className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
                        <Users className={`mx-auto text-gray-400 mb-2 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} />
                        <h3 className={`font-semibold mb-2 ${isMobile ? 'text-sm' : 'text-lg'}`}>No Squad Selected</h3>
                        <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Please add players to your squad first before creating formations.
                        </p>
                        <Button onClick={() => setActiveTab('squad')} size={isMobile ? "sm" : "default"}>
                          Go to Squad Management
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <GameDayStyleFormationEditor
                      squadPlayers={currentTeam.squadPlayers}
                      periods={currentTeam.periods}
                      gameFormat={event.game_format || '7-a-side'}
                      globalCaptainId={currentTeam.globalCaptainId}
                      nameDisplayOption={nameDisplayOption as any}
                      onPeriodsChange={handlePeriodsChange}
                      onCaptainChange={handleCaptainChange}
                      gameDuration={event.game_duration || 50}
                      isPositionsLocked={currentTeam.isPositionsLocked || false}
                      eventType={event.event_type}
                    />
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
      </DialogContent>
    </Dialog>

    {/* Match Day Pack Modal */}
    <Dialog open={showMatchDayPack} onOpenChange={setShowMatchDayPack}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Match Day Pack</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[95vh] match-day-pack-scroll">
          <MatchDayPackView 
            event={event} 
            onClose={() => setShowMatchDayPack(false)} 
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>

    {/* Staff Linking Modal */}
    <StaffAccountLinkingModal
      isOpen={linkModalOpen}
      onClose={() => {
        setLinkModalOpen(false);
        setStaffLinksRefresh((v) => v + 1);
      }}
      teamId={teamId}
      teamName={(teamData as any)?.name || 'Team'}
    />

    {/* AI Team Builder Dialog */}
    {currentTeam && (
      <AITeamBuilderDialog
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        onApply={handleApplyAISelection}
        teamId={teamId}
        eventId={event.id}
        gameFormat={event.game_format || '11-a-side'}
        gameDuration={event.game_duration || 90}
        teamNumber={currentTeam.teamNumber}
        squadPlayers={currentTeam.squadPlayers}
        currentFormation={currentTeam.periods[0]?.formation}
      />
    )}
  </>
);
};
