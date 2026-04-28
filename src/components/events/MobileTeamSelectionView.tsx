
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Gamepad2, ChevronLeft, Timer, Trash2, CheckCircle, Clock, XCircle, UserCheck } from 'lucide-react';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTeamPlayers } from '@/hooks/useTeamPlayers';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MobileTeamSelectionViewProps {
  event: DatabaseEvent;
  teamId: string;
  teamName?: string;
  onOpenFullManager: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
  onTeamDeleted?: () => void;
  refreshTrigger?: number;
  canEdit?: boolean;
  onTeamIndexChange?: (index: number) => void;
}

interface TeamSelection {
  teamNumber: number;
  performanceCategory?: string;
  periods: any[];
  squadPlayers: number;
  formation?: string;
  staffIds: string[];
}

interface AvailabilitySummary {
  available: number;
  pending: number;
  unavailable: number;
}

interface TrainingDrill {
  id: string;
  name: string;
  duration_minutes: number;
  order_index: number;
}

export const MobileTeamSelectionView: React.FC<MobileTeamSelectionViewProps> = ({
  event,
  teamId,
  teamName,
  onOpenFullManager,
  onClose,
  isExpanded = false,
  onTeamDeleted,
  canEdit = false,
  refreshTrigger,
  onTeamIndexChange
}) => {
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [trainingDrills, setTrainingDrills] = useState<TrainingDrill[]>([]);
  const [captainNames, setCaptainNames] = useState<Record<string, string>>({});
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary>({ available: 0, pending: 0, unavailable: 0 });
  const { players: teamPlayers } = useTeamPlayers(teamId);

  // Helper to get display name for a team.
  // Priority: team name (single-team only) > performance category > "Team N"
  const getTeamDisplayName = (team: TeamSelection, _index: number): string => {
    const isTraining = event.event_type === 'training';

    // For a single team always show the real team name so we never replace
    // it with an arbitrary performance category label (e.g. "Messi").
    if (teamSelections.length === 1 && teamName) {
      return teamName;
    }

    // For multi-team events use the category label to distinguish squads.
    if (team.performanceCategory && team.performanceCategory !== 'No category') {
      return team.performanceCategory;
    }

    return isTraining ? `Group ${team.teamNumber}` : `Team ${team.teamNumber}`;
  };

  const handleDeleteTeam = async (teamNumber: number) => {
    if (teamSelections.length <= 1) {
      toast.error('Cannot delete the last remaining team');
      return;
    }
    
    setIsDeleting(true);
    try {
      // Delete from event_selections table
      const { error } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', teamId)
        .eq('team_number', teamNumber);

      if (error) throw error;

      // Update events.teams array
      const remainingTeams = teamSelections
        .filter(t => t.teamNumber !== teamNumber)
        .map(t => t.teamNumber.toString());
      
      await supabase
        .from('events')
        .update({ teams: remainingTeams })
        .eq('id', event.id);

      toast.success('Team deleted successfully');
      
      // Update local state
      setTeamSelections(prev => prev.filter(t => t.teamNumber !== teamNumber));
      setCurrentTeamIndex(0);
      
      onTeamDeleted?.();
    } catch (error) {
      logger.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load performance categories for display names
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

  // Load team selections
  useEffect(() => {
    const loadTeamSelections = async () => {
      try {
        // Run all independent queries in parallel
        const [selectionsResult, squadResult, availabilityResult, categoriesResult] = await Promise.all([
          supabase
            .from('event_selections')
            .select('*, performance_categories(name)')
            .eq('event_id', event.id)
            .eq('team_id', teamId)
            .order('team_number', { ascending: true })
            .order('period_number', { ascending: true }),
          // team_squads gives the authoritative squad count even before formation is set
          supabase
            .from('team_squads')
            .select('player_id, team_number')
            .eq('event_id', event.id)
            .eq('team_id', teamId),
          // availability summary for the inline card
          supabase
            .from('event_availability')
            .select('status')
            .eq('event_id', event.id)
            .eq('role', 'player'),
          // Performance categories for synthesizing teams that only have scores
          supabase
            .from('performance_categories')
            .select('id, name')
            .eq('team_id', teamId)
            .order('name', { ascending: true }),
        ]);

        if (selectionsResult.error) throw selectionsResult.error;
        const selections = selectionsResult.data || [];
        const orderedCategories = (categoriesResult.data || []) as Array<{ id: string; name: string }>;

        // Build squad-count map from team_squads (accurate even if formation not yet set)
        const squadByTeamNum: Record<number, number> = {};
        (squadResult.data || []).forEach(row => {
          const n = row.team_number || 1;
          squadByTeamNum[n] = (squadByTeamNum[n] || 0) + 1;
        });

        // Availability summary across all player roles for this event
        const avail = availabilityResult.data || [];
        setAvailabilitySummary({
          available: avail.filter(a => a.status === 'available').length,
          pending: avail.filter(a => a.status === 'pending').length,
          unavailable: avail.filter(a => a.status === 'unavailable').length,
        });

        // Group event_selections by team number
        const groupedSelections = selections.reduce((acc, selection) => {
          const teamNum = selection.team_number || 1;
          if (!acc[teamNum]) {
            // Extract staff IDs from the staff_selection JSONB column
            const rawStaff = selection.staff_selection;
            const staffIds: string[] = Array.isArray(rawStaff)
              ? rawStaff.map((s: any) => s.staffId || s.id).filter(Boolean)
              : [];
            acc[teamNum] = {
              teamNumber: teamNum,
              performanceCategory: selection.performance_categories?.name || 'No category',
              periods: [],
              squadPlayers: 0,
              formation: undefined as string | undefined,
              staffIds,
            };
          }
          acc[teamNum].periods.push(selection);
          // Use the first period's formation as the team's formation label
          if (!acc[teamNum].formation && selection.period_number === 1) {
            acc[teamNum].formation = selection.formation || undefined;
          }
          return acc;
        }, {} as Record<number, TeamSelection>);

        // Count unique squad players per team — prefer team_squads count, fall back to
        // player_positions/substitute_players in event_selections
        Object.values(groupedSelections).forEach(team => {
          const squadCount = squadByTeamNum[team.teamNumber];
          if (squadCount !== undefined) {
            team.squadPlayers = squadCount;
          } else {
            const allPlayerIds = new Set<string>();
            team.periods.forEach(period => {
              if (period.player_positions && Array.isArray(period.player_positions)) {
                period.player_positions.forEach((pos: any) => {
                  if (pos.playerId) allPlayerIds.add(pos.playerId);
                });
              }
              if (period.substitute_players && Array.isArray(period.substitute_players)) {
                period.substitute_players.forEach((id: string) => {
                  if (id) allPlayerIds.add(id);
                });
              }
            });
            team.squadPlayers = allPlayerIds.size;
          }
        });

        // Synthesize entries for team_N values that appear in event.scores but
        // have no event_selections row yet (e.g. score recorded for Team 2 but
        // squad not picked).
        const scores = (event.scores as Record<string, any>) || {};
        const haveTeamNumbers = new Set<number>(Object.values(groupedSelections).map(t => t.teamNumber));
        Object.keys(scores).forEach(key => {
          const m = /^team_(\d+)$/.exec(key);
          if (!m) return;
          const n = parseInt(m[1], 10);
          if (haveTeamNumbers.has(n)) return;
          const cat = orderedCategories[n - 1];
          groupedSelections[n] = {
            teamNumber: n,
            performanceCategory: cat?.name || `Team ${n}`,
            periods: [],
            squadPlayers: squadByTeamNum[n] || 0,
            formation: undefined,
            staffIds: [],
          };
          haveTeamNumbers.add(n);
        });

        const teamsArray = Object.values(groupedSelections).sort((a, b) => a.teamNumber - b.teamNumber);
        setTeamSelections(teamsArray);

        // Captain name resolution deferred to the teamPlayers+teamSelections effect below

        // Fetch staff names via team staff RPC — avoids profile RLS issues
        if (teamsArray.some(t => t.staffIds.length > 0)) {
          const { data: staffData } = await supabase
            .rpc('get_consolidated_team_staff', { p_team_id: teamId });
          if (staffData) {
            const namesMap: Record<string, string> = {};
            (staffData as any[]).forEach(s => {
              const id = s.linked_user_id || s.id;
              if (id && s.name) namesMap[id] = s.name;
            });
            setStaffNames(namesMap);
          }
        }
      } catch (error) {
        logger.error('Error loading team selections:', error);
      }
    };

    loadTeamSelections();
    
    // Load training drills for training events
    if (event.event_type === 'training') {
      loadTrainingDrills();
    }
  }, [event.id, teamId, refreshTrigger]);

  // Load training drills
  const loadTrainingDrills = async () => {
    try {
      // First check if training session exists
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('event_id', event.id)
        .eq('team_id', teamId)
        .maybeSingle();

      if (sessionError || !session) {
        logger.log('No training session found for event:', event.id);
        setTrainingDrills([]);
        return;
      }

      const { data: drills, error } = await supabase
        .from('training_session_drills')
        .select(`
          id,
          duration_minutes,
          custom_drill_name,
          sequence_order,
          drills(
            id,
            name
          )
        `)
        .eq('training_session_id', session.id)
        .order('sequence_order', { ascending: true });

      if (error) throw error;

      const formattedDrills = drills?.map((drill: any) => ({
        id: drill.id,
        name: (drill.drills as any)?.name || drill.custom_drill_name || 'Custom Drill',
        duration_minutes: drill.duration_minutes || 0,
        order_index: drill.sequence_order || 0
      })) || [];

      setTrainingDrills(formattedDrills);
    } catch (error) {
      logger.error('Error loading training drills:', error);
      setTrainingDrills([]);
    }
  };

  // Resolve captain names whenever team selections or team players change
  useEffect(() => {
    if (teamSelections.length === 0 || teamPlayers.length === 0) return;
    const captainIds = teamSelections
      .map(team => team.periods[0]?.captain_id)
      .filter(Boolean) as string[];
    if (captainIds.length > 0) {
      const namesMap: Record<string, string> = {};
      teamPlayers.forEach(p => {
        if (captainIds.includes(p.id)) {
          namesMap[p.id] = p.name;
        }
      });
      setCaptainNames(namesMap);
    }
  }, [teamSelections, teamPlayers]);

  const currentTeam = teamSelections[currentTeamIndex];

  if (teamSelections.length === 0) {
    return (
      <div className="w-full">
        {isExpanded && onClose && (
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        )}
        <Card className="w-full">
          <CardContent className="py-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">
              {event.event_type === 'training' ? 'No Training Plan' : 'No Team Selection'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {event.event_type === 'training' 
                ? 'No training plan has been created for this session yet.'
                : 'No squad has been selected for this event yet.'
              }
            </p>
            <Button onClick={onOpenFullManager} size="sm" className="w-full">
              {event.event_type === 'training' ? 'Create Training Plan' : 'Set Up Team'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header with close button for expanded view */}
      {isExpanded && onClose && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
            <h3 className="font-medium">
              {event.event_type === 'training' ? 'Training Plan' : 'Group Selection'}
            </h3>
          <div className="w-16" /> {/* Spacer for center alignment */}
        </div>
      )}

      {/* Team Tabs - Compact version for mobile */}
      {teamSelections.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {teamSelections.map((team, index) => (
            <Button
              key={team.teamNumber}
              variant={index === currentTeamIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCurrentTeamIndex(index);
                onTeamIndexChange?.(index);
              }}
              className="flex-shrink-0 text-xs px-2 py-1"
            >
              {getTeamDisplayName(team, index)}
            </Button>
          ))}
        </div>
      )}

      {currentTeam && (
        <Card className="w-full">
          <CardHeader className="pb-1.5 px-3 pt-2.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {getTeamDisplayName(currentTeam, currentTeamIndex)}
              </CardTitle>
              {!isExpanded && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={onOpenFullManager} className="text-xs px-2 py-1">
                    Edit
                  </Button>

                  {canEdit && teamSelections.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{getTeamDisplayName(currentTeam, currentTeamIndex)}"?
                            This will remove all player selections and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(currentTeam.teamNumber)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>

            {/* Condensed summary row: players · formation · staff · availability */}
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3 shrink-0" />
                {currentTeam.squadPlayers}p
              </span>
              {event.event_type !== 'training' && currentTeam.formation && (
                <span className="flex items-center gap-0.5">
                  <Gamepad2 className="h-3 w-3 shrink-0" />
                  {currentTeam.formation}
                </span>
              )}
              {currentTeam.staffIds.length > 0 && (
                <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {staffNames[currentTeam.staffIds[0]] || '…'}
                    {currentTeam.staffIds.length > 1 && ` +${currentTeam.staffIds.length - 1}`}
                  </span>
                </span>
              )}
              {availabilitySummary.available > 0 && (
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <CheckCircle className="h-3 w-3" />{availabilitySummary.available}
                </span>
              )}
              {availabilitySummary.pending > 0 && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <Clock className="h-3 w-3" />{availabilitySummary.pending}
                </span>
              )}
              {availabilitySummary.unavailable > 0 && (
                <span className="flex items-center gap-0.5 text-red-500">
                  <XCircle className="h-3 w-3" />{availabilitySummary.unavailable}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-3 pb-2.5">
            {event.event_type === 'training' ? (
              <div>
                <h4 className="font-medium mb-1.5 text-xs flex items-center gap-1 text-muted-foreground uppercase tracking-wide">
                  <Timer className="h-3 w-3" />
                  Training Drills
                </h4>
                {trainingDrills.length > 0 ? (
                  <div className="space-y-1">
                    {trainingDrills.map((drill) => (
                      <div key={drill.id} className="flex justify-between items-center py-1 px-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium">{drill.name}</span>
                        <span className="text-muted-foreground">{drill.duration_minutes}m</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No drills added yet</p>
                )}
              </div>
            ) : (
              <>
                {currentTeam.periods[0]?.captain_id && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-white">C</span>
                    </div>
                    <span className="text-sm font-medium">
                      Captain: {captainNames[currentTeam.periods[0].captain_id] || 'Loading...'}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Secondary action — visually smaller than the card content */}
            <Button
              onClick={onOpenFullManager}
              className="w-full"
              variant="ghost"
              size="sm"
            >
              <Gamepad2 className="h-4 w-4 mr-2" />
              {event.event_type === 'training' ? 'Open Training Plan' : 'Open Team Manager'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
