import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Users, Gamepad2 } from 'lucide-react';
import { SquadManagement } from './SquadManagement';
import { DragDropFormationEditor } from './DragDropFormationEditor';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { SquadPlayer, FormationPeriod, TeamSelectionState } from '@/types/teamSelection';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const { squadPlayers, loading: squadLoading } = useSquadManagement(teamId, event.id);

  // Load existing team selections
  useEffect(() => {
    const loadExistingSelections = async () => {
      try {
        const { data: existingSelections, error } = await supabase
          .from('event_selections')
          .select('*')
          .eq('event_id', event.id)
          .eq('team_id', teamId)
          .order('period_number');

        if (error) throw error;

        if (existingSelections && existingSelections.length > 0) {
          // Convert existing selections to FormationPeriod format
          const periods: FormationPeriod[] = existingSelections.map(selection => ({
            id: `period-${selection.period_number}`,
            periodNumber: selection.period_number,
            formation: selection.formation,
            duration: selection.duration_minutes,
            positions: [], // Will be populated from player_positions
            substitutes: [], // Will be populated from substitute_players
            captainId: selection.captain_id || undefined
          }));

          setSelectionState(prev => ({
            ...prev,
            periods,
            globalCaptainId: periods[0]?.captainId
          }));
        }
      } catch (error) {
        console.error('Error loading existing selections:', error);
      }
    };

    if (event.id && teamId) {
      loadExistingSelections();
    }
  }, [event.id, teamId]);

  // Update squad players when they change
  useEffect(() => {
    setSelectionState(prev => ({
      ...prev,
      squadPlayers
    }));
  }, [squadPlayers]);

  const handlePeriodsChange = (periods: FormationPeriod[]) => {
    setSelectionState(prev => ({
      ...prev,
      periods
    }));
  };

  const handleCaptainChange = (captainId: string) => {
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
      // Delete existing selections for this event
      const { error: deleteError } = await supabase
        .from('event_selections')
        .delete()
        .eq('event_id', event.id)
        .eq('team_id', teamId);

      if (deleteError) throw deleteError;

      // Create new selections for each period
      const selectionsToInsert = selectionState.periods.map(period => ({
        event_id: event.id,
        team_id: teamId,
        team_number: 1, // Default team number
        period_number: period.periodNumber,
        formation: period.formation,
        duration_minutes: period.duration,
        captain_id: selectionState.globalCaptainId,
        player_positions: period.positions.map(pos => ({
          playerId: pos.playerId,
          position: pos.positionName,
          isSubstitute: false,
          minutes: period.duration
        })).filter(p => p.playerId),
        substitute_players: period.substitutes.map(playerId => ({
          playerId,
          position: 'SUB',
          isSubstitute: true,
          minutes: 0
        })),
        staff_selection: [],
        performance_category_id: null
      }));

      const { error: insertError } = await supabase
        .from('event_selections')
        .insert(selectionsToInsert);

      if (insertError) throw insertError;

      toast.success('Team selections saved successfully!');
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save team selections');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
