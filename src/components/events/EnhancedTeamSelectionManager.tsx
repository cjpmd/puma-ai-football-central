
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, Gamepad2, Target } from 'lucide-react';
import { SquadManagement } from './SquadManagement';
import { DragDropFormationEditor } from './DragDropFormationEditor';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { SquadPlayer, FormationPeriod, TeamSelectionState } from '@/types/teamSelection';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

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
  const [selectionState, setSelectionState] = useState<TeamSelectionState>({
    teamId,
    eventId: event.id,
    squadPlayers: [],
    periods: [],
    globalCaptainId: undefined
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('squad');
  const [selectedPerformanceCategory, setSelectedPerformanceCategory] = useState<string>('none');

  const { squadPlayers, loading: squadLoading } = useSquadManagement(teamId, event.id);

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

  // Debug current user and team relationship
  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user || !teamId) return;
      
      console.log('Checking user permissions for user:', user.id, 'team:', teamId);
      
      const { data: userTeams, error } = await supabase
        .from('user_teams')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking user permissions:', error);
        return;
      }

      console.log('User teams data:', userTeams);
      
      if (!userTeams || userTeams.length === 0) {
        console.warn('User is not a member of this team');
        toast.error('You are not a member of this team');
      } else {
        console.log('User role in team:', userTeams[0].role);
      }
    };

    checkUserPermissions();
  }, [user, teamId]);

  // Load existing team selections
  useEffect(() => {
    const loadExistingSelections = async () => {
      if (!event.id || !teamId) return;
      
      try {
        console.log('Loading existing selections for event:', event.id, 'team:', teamId);
        
        const { data: existingSelections, error } = await supabase
          .from('event_selections')
          .select('*')
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .order('period_number');

        if (error) {
          console.error('Error loading existing selections:', error);
          throw error;
        }

        console.log('Existing selections loaded:', existingSelections);

        if (existingSelections && existingSelections.length > 0) {
          const periods: FormationPeriod[] = existingSelections.map(selection => ({
            id: `period-${selection.period_number}`,
            periodNumber: selection.period_number,
            formation: selection.formation,
            duration: selection.duration_minutes,
            positions: [],
            substitutes: [],
            captainId: selection.captain_id || undefined
          }));

          console.log('Converted periods:', periods);

          setSelectionState(prev => ({
            ...prev,
            periods,
            globalCaptainId: periods[0]?.captainId
          }));

          // Set performance category if available
          if (existingSelections[0]?.performance_category_id) {
            setSelectedPerformanceCategory(existingSelections[0].performance_category_id);
          }
        }
      } catch (error) {
        console.error('Error loading existing selections:', error);
        toast.error('Failed to load existing team selections');
      }
    };

    loadExistingSelections();
  }, [event.id, teamId]);

  // Update squad players when they change
  useEffect(() => {
    console.log('Squad players updated:', squadPlayers);
    setSelectionState(prev => ({
      ...prev,
      squadPlayers
    }));
  }, [squadPlayers]);

  const handlePeriodsChange = (periods: FormationPeriod[]) => {
    console.log('Periods changed:', periods);
    setSelectionState(prev => ({
      ...prev,
      periods
    }));
  };

  const handleCaptainChange = (captainId: string) => {
    console.log('Captain changed:', captainId);
    setSelectionState(prev => ({
      ...prev,
      globalCaptainId: captainId,
      periods: prev.periods.map(period => ({
        ...period,
        captainId
      }))
    }));
  };

  const handleSquadChange = (newSquadPlayers: SquadPlayer[]) => {
    console.log('Squad changed:', newSquadPlayers);
    setSelectionState(prev => ({
      ...prev,
      squadPlayers: newSquadPlayers
    }));
  };

  const saveSelections = async () => {
    if (selectionState.periods.length === 0) {
      toast.error('Please create at least one period before saving');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving selections:', selectionState);
      
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

      // Create new selections for each period
      const selectionsToInsert = selectionState.periods.map(period => ({
        event_id: event.id,
        team_id: teamId,
        team_number: 1,
        period_number: period.periodNumber,
        formation: period.formation,
        duration_minutes: period.duration,
        captain_id: selectionState.globalCaptainId || null,
        performance_category_id: selectedPerformanceCategory === 'none' ? null : selectedPerformanceCategory,
        player_positions: period.positions.map(pos => ({
          playerId: pos.playerId,
          position: pos.positionName,
          isSubstitute: false,
          minutes: period.duration
        })).filter(p => p.playerId),
        substitute_players: period.substitutes,
        staff_selection: []
      }));

      console.log('Inserting selections:', selectionsToInsert);

      const { error: insertError } = await supabase
        .from('event_selections')
        .insert(selectionsToInsert);

      if (insertError) {
        console.error('Error inserting selections:', insertError);
        throw insertError;
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

  console.log('Rendering EnhancedTeamSelectionManager:', {
    teamId,
    eventId: event.id,
    squadPlayersCount: selectionState.squadPlayers.length,
    periodsCount: selectionState.periods.length,
    user: user?.id,
    performanceCategories: performanceCategories.length
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{event.title}</h2>
              <p className="text-muted-foreground">
                {event.date} • {event.game_format} • Enhanced Team Selection
              </p>
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  User: {user.email} | Team: {teamId}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectionState.squadPlayers.length} in squad
              </Badge>
              <Badge variant="outline">
                {selectionState.periods.length} period(s)
              </Badge>
              <Button onClick={saveSelections} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Selection'}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {/* Performance Category Selection */}
          {performanceCategories.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Performance Category
              </Label>
              <Select value={selectedPerformanceCategory} onValueChange={setSelectedPerformanceCategory}>
                <SelectTrigger className="w-64 mt-1">
                  <SelectValue placeholder="Select performance category (optional)" />
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
                  eventId={event.id}
                  onSquadChange={handleSquadChange}
                />
              </TabsContent>

              <TabsContent value="formation" className="h-full mt-0">
                {selectionState.squadPlayers.length === 0 ? (
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
                    squadPlayers={selectionState.squadPlayers}
                    periods={selectionState.periods}
                    gameFormat={event.game_format || '11-a-side'}
                    globalCaptainId={selectionState.globalCaptainId}
                    nameDisplayOption="surname"
                    onPeriodsChange={handlePeriodsChange}
                    onCaptainChange={handleCaptainChange}
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
