
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TeamSelectionGrid } from './TeamSelectionGrid';
import { TeamSelector } from './TeamSelector';
import { FormationPeriodEditor } from './FormationPeriodEditor';
import { TeamSelectionState } from '@/types/teamSelection';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MatchDayPackView } from './MatchDayPackView';

interface EnhancedTeamSelectionManagerProps {
  event: DatabaseEvent;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedTeamSelectionManager: React.FC<EnhancedTeamSelectionManagerProps> = ({
  event,
  teamId,
  isOpen,
  onClose
}) => {
  const [teamSelection, setTeamSelection] = useState<TeamSelectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showMatchDayPack, setShowMatchDayPack] = useState(false);

  useEffect(() => {
    loadTeamSelection();
  }, [event.id]);

  const loadTeamSelection = async () => {
    setLoading(true);
    setError(null);

    try {
      // Query event_selections instead of team_selections
      const { data, error } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id);

      if (error) {
        console.error('Error loading event selections:', error);
        setError(error.message);
        // Initialize a default team selection if none exists
        setTeamSelection(createDefaultTeamSelection(event.id, event.team_id));
      } else {
        if (data && data.length > 0) {
          // Convert event_selections data to TeamSelectionState format
          const selectionData = data[0];
          const convertedSelection: TeamSelectionState = {
            teamId: selectionData.team_id,
            eventId: selectionData.event_id,
            squadPlayers: [], // Will need to be populated from actual player data
            periods: [{
              id: selectionData.id,
              periodNumber: selectionData.period_number || 1,
              formation: selectionData.formation,
              duration: selectionData.duration_minutes || 90,
              positions: [], // Will need to be populated from player_positions
              substitutes: [], // Will need to be populated from substitutes
              captainId: selectionData.captain_id
            }],
            globalCaptainId: selectionData.captain_id,
          };
          setTeamSelection(convertedSelection);
        } else {
          // If no data is found, initialize a default team selection
          setTeamSelection(createDefaultTeamSelection(event.id, event.team_id));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTeamSelection = (eventId: string, teamId: string): TeamSelectionState => {
    return {
      teamId: teamId,
      eventId: eventId,
      squadPlayers: [],
      periods: [],
      globalCaptainId: null,
    };
  };

  const handleTeamSelectionChange = (newTeamSelection: TeamSelectionState) => {
    setTeamSelection(newTeamSelection);
  };

  const handleSave = async () => {
    if (!teamSelection) {
      toast({
        title: 'Error',
        description: 'No team selection data to save.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert TeamSelectionState back to event_selections format
      const eventSelectionData = {
        event_id: teamSelection.eventId,
        team_id: teamSelection.teamId,
        formation: teamSelection.periods[0]?.formation || '4-4-2',
        duration_minutes: teamSelection.periods[0]?.duration || 90,
        period_number: teamSelection.periods[0]?.periodNumber || 1,
        captain_id: teamSelection.globalCaptainId,
        player_positions: [],
        substitutes: [],
        staff_selection: []
      };

      const { data, error } = await supabase
        .from('event_selections')
        .upsert(eventSelectionData, { onConflict: 'event_id,team_id,period_number' })
        .select()
        .single();

      if (error) {
        console.error('Error saving event selection:', error);
        setError(error.message);
        toast({
          title: 'Error',
          description: `Failed to save team selection: ${error.message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Team selection saved successfully.',
        });
        // Update state with saved data
        loadTeamSelection();
      }
    } finally {
      setLoading(false);
    }
  };

  if (showMatchDayPack) {
    return (
      <MatchDayPackView 
        event={event}
        onClose={() => setShowMatchDayPack(false)}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>
                Team Selection - {event.title}
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowMatchDayPack(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  📦 Generate Match Day Pack
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row">
            {/* Left Panel: Team Selector and Formation Period Editor */}
            <div className="w-full md:w-1/3 p-4 border-r overflow-y-auto">
              {loading && <p>Loading...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}

              {teamSelection && (
                <>
                  <TeamSelector
                    selectedTeams={teamSelection.periods.map(period => period.id)}
                    onTeamsChange={(teams) => {
                      const newPeriods = teams.map((teamId, index) => ({
                        ...teamSelection.periods[index],
                        id: teamId,
                      }));
                      handleTeamSelectionChange({ ...teamSelection, periods: newPeriods });
                    }}
                    primaryTeamId={teamSelection.teamId}
                    maxTeams={3}
                  />

                  <FormationPeriodEditor
                    teamSelection={teamSelection}
                    onTeamSelectionChange={handleTeamSelectionChange}
                  />
                </>
              )}
            </div>

            {/* Right Panel: Team Selection Grid */}
            <div className="w-full md:w-2/3 p-4 overflow-auto">
              {teamSelection && (
                <TeamSelectionGrid
                  teamSelection={teamSelection}
                  onTeamSelectionChange={handleTeamSelectionChange}
                />
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Team Selection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
