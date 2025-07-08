import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, Gamepad2, Target, Plus, X, FileText } from 'lucide-react';
import { SquadManagement } from './SquadManagement';
import { DragDropFormationEditor } from './DragDropFormationEditor';
import { MatchDayPackView } from './MatchDayPackView';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { SquadPlayer, FormationPeriod, TeamSelectionState } from '@/types/teamSelection';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface TeamSelection {
  teamNumber: number;
  squadPlayers: SquadPlayer[];
  periods: FormationPeriod[];
  globalCaptainId?: string;
  performanceCategory?: string;
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
  const teamId = propTeamId || event.team_id;
  const [teamSelections, setTeamSelections] = useState<TeamSelection[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('squad');
  const [showMatchDayPack, setShowMatchDayPack] = useState(false);

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

  // Load main squad for initial team
  const { squadPlayers: mainSquadPlayers, loading: squadLoading } = useSquadManagement(teamId, event.id);

  // Load team name display option
  const { data: teamData } = useQuery({
    queryKey: ['team-settings', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('name_display_option')
        .eq('id', teamId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  // Initialize teams based on event.teams length when main squad is loaded
  useEffect(() => {
    if (mainSquadPlayers.length > 0) {
      // Determine number of teams from event.teams if available, otherwise default to 1
      const eventTeamsArray = event.teams as any[] || [];
      const teamCount = Math.max(eventTeamsArray.length, 1);
      
      console.log('Initializing team selections with count:', teamCount, 'from event.teams:', eventTeamsArray);
      
      // Create initial team selections
      const initialTeamSelections: TeamSelection[] = [];
      
      for (let i = 0; i < teamCount; i++) {
        initialTeamSelections.push({
          teamNumber: i + 1,
          squadPlayers: i === 0 ? mainSquadPlayers : [], // Only first team gets the main squad
          periods: [],
          globalCaptainId: undefined,
          performanceCategory: 'none'
        });
      }
      
      console.log('Setting initial team selections:', initialTeamSelections);
      setTeamSelections(initialTeamSelections);
    }
  }, [mainSquadPlayers, event.teams, event.id]); // Added event.teams and event.id as dependencies

  // Load existing team selections
  useEffect(() => {
    const loadExistingSelections = async () => {
      if (!event.id || !teamId || teamSelections.length === 0) return;
      
      try {
        console.log('Loading existing selections for event:', event.id, 'team:', teamId);
        
        const { data: existingSelections, error } = await supabase
          .from('event_selections')
          .select('*')
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .order('team_number', { ascending: true })
          .order('period_number', { ascending: true });

        if (error) {
          console.error('Error loading existing selections:', error);
          throw error;
        }

        console.log('Existing selections loaded:', existingSelections);

        if (existingSelections && existingSelections.length > 0) {
          // Group selections by team number
          const groupedSelections = existingSelections.reduce((acc, selection) => {
            const teamNum = selection.team_number || 1;
            if (!acc[teamNum]) acc[teamNum] = [];
            acc[teamNum].push(selection);
            return acc;
          }, {} as Record<number, any[]>);

          const loadedTeamSelections: TeamSelection[] = [...teamSelections];

          for (const [teamNum, selections] of Object.entries(groupedSelections)) {
            const teamIndex = parseInt(teamNum) - 1;
            if (teamIndex >= 0 && teamIndex < loadedTeamSelections.length) {
              const periods: FormationPeriod[] = selections.map(selection => ({
                id: `period-${selection.period_number}`,
                periodNumber: selection.period_number,
                formation: selection.formation,
                duration: selection.duration_minutes,
                positions: (selection.player_positions || []).map((pos: any, index: number) => ({
                  id: `position-${index}`,
                  positionName: pos.position,
                  abbreviation: pos.abbreviation || pos.position?.substring(0, 2) || '',
                  positionGroup: pos.positionGroup || 'midfielder',
                  x: pos.x || 50,
                  y: pos.y || 50,
                  playerId: pos.playerId || pos.player_id
                })),
                substitutes: selection.substitute_players || [],
                captainId: selection.captain_id || undefined
              }));

              loadedTeamSelections[teamIndex] = {
                ...loadedTeamSelections[teamIndex],
                periods,
                globalCaptainId: periods[0]?.captainId,
                performanceCategory: selections[0]?.performance_category_id || 'none'
              };
            }
          }

          console.log('Updated team selections with existing data:', loadedTeamSelections);
          setTeamSelections(loadedTeamSelections);
        }
      } catch (error) {
        console.error('Error loading existing selections:', error);
        toast.error('Failed to load existing team selections');
      }
    };

    loadExistingSelections();
  }, [event.id, teamId, teamSelections.length]); // Only run when teamSelections are initialized

  const addTeam = () => {
    const newTeamNumber = teamSelections.length + 1;
    const newTeam: TeamSelection = {
      teamNumber: newTeamNumber,
      squadPlayers: [], // Start with empty squad for additional teams
      periods: [],
      globalCaptainId: undefined,
      performanceCategory: 'none'
    };
    setTeamSelections([...teamSelections, newTeam]);
    setCurrentTeamIndex(teamSelections.length);
    setActiveTab('squad');
  };

  const getCurrentTeam = (): TeamSelection | null => {
    return teamSelections[currentTeamIndex] || null;
  };

  const updateCurrentTeam = (updates: Partial<TeamSelection>) => {
    const updatedSelections = teamSelections.map((team, index) => 
      index === currentTeamIndex ? { ...team, ...updates } : team
    );
    setTeamSelections(updatedSelections);
  };

  const handlePeriodsChange = (periods: FormationPeriod[]) => {
    updateCurrentTeam({ periods });
  };

  const handleCaptainChange = (captainId: string) => {
    const updatedPeriods = getCurrentTeam()?.periods.map(period => ({
      ...period,
      captainId
    })) || [];
    
    updateCurrentTeam({ 
      globalCaptainId: captainId,
      periods: updatedPeriods
    });
  };

  const handleSquadChange = (newSquadPlayers: SquadPlayer[]) => {
    updateCurrentTeam({ squadPlayers: newSquadPlayers });
  };

  const handlePerformanceCategoryChange = (categoryId: string) => {
    updateCurrentTeam({ performanceCategory: categoryId });
  };

  const saveSelections = async () => {
    if (teamSelections.length === 0) {
      toast.error('Please create at least one team before saving');
      return;
    }

    const hasAnyPeriods = teamSelections.some(team => team.periods.length > 0);
    if (!hasAnyPeriods) {
      toast.error('Please create at least one period for any team before saving');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving selections:', teamSelections);
      
      // Delete existing selections for this event
      const { error: deleteError } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', teamId);

      if (deleteError) {
        console.error('Error deleting existing selections:', deleteError);
        throw deleteError;
      }

      // Create new selections for each team and period
      const selectionsToInsert = [];
      
      for (const team of teamSelections) {
        for (const period of team.periods) {
          // Convert positions to correct format for database
          const playerPositions = period.positions
            .filter(pos => pos.playerId) // Only include positions with players
            .map(pos => ({
              playerId: pos.playerId,
              player_id: pos.playerId, // Include both formats for compatibility
              position: pos.positionName,
              abbreviation: pos.abbreviation,
              positionGroup: pos.positionGroup,
              x: pos.x,
              y: pos.y,
              isSubstitute: false,
              minutes: period.duration
            }));

          console.log('Converting positions for period:', period.id, playerPositions);

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
            staff_selection: []
          });
        }
      }

      console.log('Inserting selections:', selectionsToInsert);

      if (selectionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('event_selections')
          .insert(selectionsToInsert);

        if (insertError) {
          console.error('Error inserting selections:', insertError);
          throw insertError;
        }
      }

      toast.success('Team selections saved successfully!');
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save team selections');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Show Match Day Pack view if requested
  if (showMatchDayPack) {
    return (
      <MatchDayPackView 
        event={event} 
        onClose={() => setShowMatchDayPack(false)} 
      />
    );
  }

  const currentTeam = getCurrentTeam();
  const nameDisplayOption = teamData?.name_display_option || 'surname';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{event.title}</h2>
              <p className="text-muted-foreground">
                {event.date} • {event.game_format} • Team Selection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {teamSelections.length} team(s)
              </Badge>
              <Badge variant="outline">
                {currentTeam?.squadPlayers.length || 0} in squad
              </Badge>
              <Badge variant="outline">
                {currentTeam?.periods.length || 0} period(s)
              </Badge>
              <Button 
                onClick={() => setShowMatchDayPack(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                📦 Generate Match Day Pack
              </Button>
              <Button onClick={saveSelections} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Selection'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>

          {/* Team Selection */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Teams:</Label>
              {teamSelections.map((team, index) => (
                <Button
                  key={team.teamNumber}
                  variant={index === currentTeamIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentTeamIndex(index)}
                >
                  Team {team.teamNumber}
                </Button>
              ))}
              <Button onClick={addTeam} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Performance Category Selection for Current Team */}
            {performanceCategories.length > 0 && currentTeam && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Category:
                </Label>
                <Select value={currentTeam.performanceCategory} onValueChange={handlePerformanceCategoryChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific category</SelectItem>
                    {performanceCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
              <TabsTrigger value="squad" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Squad Management
              </TabsTrigger>
              <TabsTrigger value="formation" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Formation & Selection
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto p-6">
              <TabsContent value="squad" className="h-full mt-0">
                <SquadManagement
                  teamId={teamId}
                  eventId={currentTeam?.teamNumber === 1 ? event.id : null}
                  globalCaptainId={currentTeam?.globalCaptainId}
                  onSquadChange={handleSquadChange}
                  onCaptainChange={handleCaptainChange}
                />
              </TabsContent>

              <TabsContent value="formation" className="h-full mt-0">
                {!currentTeam || currentTeam.squadPlayers.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Squad Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Please add players to your squad first before creating formations.
                      </p>
                      <Button onClick={() => setActiveTab('squad')}>
                        Go to Squad Management
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <DragDropFormationEditor
                    squadPlayers={currentTeam.squadPlayers}
                    periods={currentTeam.periods}
                    gameFormat={event.game_format || '11-a-side'}
                    globalCaptainId={currentTeam.globalCaptainId}
                    nameDisplayOption={nameDisplayOption as any}
                    onPeriodsChange={handlePeriodsChange}
                    onCaptainChange={handleCaptainChange}
                    gameDuration={event.game_duration || 50}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
