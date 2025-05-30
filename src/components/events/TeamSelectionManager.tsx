
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlayerSelectionPanel } from './PlayerSelectionPanel';
import { StaffSelectionSection } from './StaffSelectionSection';
import { supabase } from '@/integrations/supabase/client';
import { GameFormat } from '@/types';
import { eventPlayerStatsService } from '@/services/eventPlayerStatsService';

interface TeamSelection {
  formation: string;
  players: Array<{ playerId: string; position: string; isSubstitute?: boolean; substitutionTime?: number }>;
  substitutes: Array<{ playerId: string; position: string; isSubstitute?: boolean; substitutionTime?: number }>;
  captain: string | null;
  staff: Array<{ staffId: string; role: string }>;
  performanceCategoryId: string | null;
  kitSelection: {
    home: boolean;
    away: boolean;
  };
}

interface Period {
  number: number;
  name: string;
  duration: number;
}

interface TeamSelectionManagerProps {
  eventId: string;
  primaryTeamId: string;
  gameFormat: GameFormat;
  onClose: () => void;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  eventId,
  primaryTeamId,
  gameFormat,
  onClose
}) => {
  const [periods, setPeriods] = useState<Period[]>([
    { number: 1, name: '1st Half', duration: 45 },
    { number: 2, name: '2nd Half', duration: 45 },
  ]);
  const [selections, setSelections] = useState<{ [periodNumber: number]: TeamSelection }>({});
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, [eventId, primaryTeamId, gameFormat]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Set default periods based on game format
      if (gameFormat === '7-a-side') {
        setPeriods([
          { number: 1, name: '1st Half', duration: 30 },
          { number: 2, name: '2nd Half', duration: 30 },
        ]);
      } else if (gameFormat === '11-a-side') {
        setPeriods([
          { number: 1, name: '1st Half', duration: 45 },
          { number: 2, name: '2nd Half', duration: 45 },
        ]);
      }

      // Load available players for the team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', primaryTeamId)
        .order('squad_number', { ascending: true });

      if (playersError) throw playersError;
      setAvailablePlayers(players || []);

      // Load available staff for the team
      const { data: staff, error: staffError } = await supabase
        .from('team_staff')
        .select('id, name, role')
        .eq('team_id', primaryTeamId);

      if (staffError) throw staffError;
      setAvailableStaff(staff || []);

      // Load existing selections
      const { data: existingSelections, error: selectionsError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_id', primaryTeamId);

      if (selectionsError) throw selectionsError;

      // Organize existing selections by period
      const organizedSelections: { [periodNumber: number]: TeamSelection } = {};
      existingSelections?.forEach((selection) => {
        organizedSelections[selection.period_number] = {
          formation: selection.formation,
          players: Array.isArray(selection.player_positions) 
            ? selection.player_positions as Array<{ playerId: string; position: string; isSubstitute?: boolean; substitutionTime?: number }>
            : [],
          substitutes: Array.isArray(selection.substitute_players) 
            ? selection.substitute_players as Array<{ playerId: string; position: string; isSubstitute?: boolean; substitutionTime?: number }>
            : [],
          captain: selection.captain_id || null,
          staff: Array.isArray(selection.staff_selection) 
            ? selection.staff_selection as Array<{ staffId: string; role: string }>
            : [],
          performanceCategoryId: selection.performance_category_id || null,
          kitSelection: (selection.kit_selection as { home: boolean; away: boolean }) || { home: true, away: false }
        };
      });

      setSelections(organizedSelections);
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load initial data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (
    periodNumber: number,
    newSelection: TeamSelection
  ) => {
    setSelections((prevSelections) => ({
      ...prevSelections,
      [periodNumber]: newSelection
    }));
  };

  const handleSaveSelections = async () => {
    if (!primaryTeamId) return;

    try {
      setSaving(true);
      console.log('Saving selections for all periods...');

      // Save all period selections
      const promises = periods.map(async (period) => {
        const selection = selections[period.number];
        if (!selection?.formation) return;

        const selectionData = {
          event_id: eventId,
          team_id: primaryTeamId,
          period_number: period.number,
          team_number: 1,
          formation: selection.formation,
          player_positions: selection.players,
          substitute_players: selection.substitutes,
          captain_id: selection.captain || null,
          duration_minutes: period.duration,
          performance_category_id: selection.performanceCategoryId || null,
          staff_selection: selection.staff || [],
          kit_selection: selection.kitSelection || { home: true, away: false }
        };

        // Check if selection already exists
        const { data: existing } = await supabase
          .from('event_selections')
          .select('id')
          .eq('event_id', eventId)
          .eq('team_id', primaryTeamId)
          .eq('period_number', period.number)
          .eq('team_number', 1)
          .single();

        if (existing) {
          // Update existing selection
          const { error } = await supabase
            .from('event_selections')
            .update(selectionData)
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Create new selection
          const { error } = await supabase
            .from('event_selections')
            .insert([selectionData]);
          
          if (error) throw error;
        }
      });

      await Promise.all(promises);

      // Sync event player stats after saving selections
      console.log('Syncing event player stats...');
      await eventPlayerStatsService.syncEventPlayerStats(eventId);

      // Check if event is completed and update stats accordingly
      await eventPlayerStatsService.checkAndUpdateCompletedEventStats(eventId);

      toast({
        title: 'Success',
        description: 'Team selections saved successfully and player stats updated',
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving selections:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save selections',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Selection</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading data...</div>
        ) : (
          <Tabs defaultValue="1" className="space-y-4">
            <TabsList>
              {periods.map((period) => (
                <TabsTrigger key={period.number} value={period.number.toString()}>
                  {period.name}
                  <Badge className="ml-2">{period.duration} mins</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {periods.map((period) => (
              <TabsContent key={period.number} value={period.number.toString()}>
                <div className="space-y-4">
                  <PlayerSelectionPanel
                    teamId={primaryTeamId}
                    selectedPlayers={selections[period.number]?.players?.map(p => p.playerId) || []}
                    substitutePlayers={selections[period.number]?.substitutes?.map(s => s.playerId) || []}
                    captainId={selections[period.number]?.captain || ''}
                    onPlayersChange={(playerIds) => {
                      const players = playerIds.map(id => ({ playerId: id, position: '', isSubstitute: false }));
                      handleSelectionChange(period.number, {
                        ...selections[period.number],
                        players,
                      } as TeamSelection);
                    }}
                    onSubstitutesChange={(substituteIds) => {
                      const substitutes = substituteIds.map(id => ({ playerId: id, position: '', isSubstitute: true }));
                      handleSelectionChange(period.number, {
                        ...selections[period.number],
                        substitutes,
                      } as TeamSelection);
                    }}
                    onCaptainChange={(captainId) => {
                      handleSelectionChange(period.number, {
                        ...selections[period.number],
                        captain: captainId,
                      } as TeamSelection);
                    }}
                    eventType="match"
                    showFormationView={true}
                    formation={selections[period.number]?.formation || '4-3-3'}
                    onFormationChange={(formation) => {
                      handleSelectionChange(period.number, {
                        ...selections[period.number],
                        formation,
                      } as TeamSelection);
                    }}
                    gameFormat={gameFormat}
                    eventId={eventId}
                    teamNumber={1}
                    periodNumber={period.number}
                    showSubstitutesInFormation={true}
                  />
                  <StaffSelectionSection
                    availableStaff={availableStaff}
                    existingSelection={selections[period.number]?.staff || []}
                    onSelectionChange={(newStaff) => {
                      handleSelectionChange(period.number, {
                        ...selections[period.number],
                        staff: newStaff,
                      } as TeamSelection);
                    }}
                  />
                </div>
              </TabsContent>
            ))}
            <Button onClick={handleSaveSelections} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Selections'}
            </Button>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
