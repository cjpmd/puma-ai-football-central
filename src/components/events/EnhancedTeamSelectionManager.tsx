
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { TeamSelectionManager } from '@/components/events/TeamSelectionManager';
import { AvailabilityDrivenSquadManagement } from '@/components/events/AvailabilityDrivenSquadManagement';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileTeamSelectionView } from '@/components/events/MobileTeamSelectionView';
import { DatabaseEvent } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';

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
  onClose,
}) => {
  const [selectedView, setSelectedView] = useState<'squad' | 'selection' | 'mobile'>('squad');
  const [selectedTeamNumber, setSelectedTeamNumber] = useState<number>(1);
  const [eventTeams, setEventTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useMobileDetection();

  // Load event teams data
  useEffect(() => {
    if (!isOpen || !event?.id) return;

    let cancelled = false;
    
    const loadEventTeams = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('event_teams')
          .select('*')
          .eq('event_id', event.id)
          .order('team_number');

        if (error) throw error;
        if (cancelled) return;
        
        setEventTeams(data || []);
        
        // If no teams exist but event has teams > 1, create them
        const numTeams = typeof event.teams === 'number' ? event.teams : (Array.isArray(event.teams) ? event.teams.length : 1);
        if ((!data || data.length === 0) && numTeams > 1) {
          const teamsToCreate = [];
          for (let i = 1; i <= numTeams; i++) {
            teamsToCreate.push({
              event_id: event.id,
              team_id: event.team_id,
              team_number: i,
            });
          }
          
          const { data: newTeams, error: createError } = await supabase
            .from('event_teams')
            .insert(teamsToCreate)
            .select();
            
          if (createError) throw createError;
          if (!cancelled) {
            setEventTeams(newTeams || []);
          }
        }
      } catch (error) {
        console.error('Error loading event teams:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEventTeams();

    return () => {
      cancelled = true;
    };
  }, [event?.id, isOpen]);

  const handleTeamNumberChange = (teamNumber: number) => {
    setSelectedTeamNumber(teamNumber);
  };

  const currentTeamId = teamId || event?.team_id;

  // Memoized callbacks to prevent infinite re-renders
  const handleSquadChange = useCallback((squadPlayers: any[]) => {
    console.log('Squad updated:', squadPlayers);
  }, []);

  const handleCaptainChange = useCallback((captainId: string) => {
    console.log('Captain updated:', captainId);
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Selection - {event?.title}
          </DialogTitle>
          <DialogDescription>
            Manage squad selection and team lineups for this event
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Mobile View Toggle */}
          {isMobile && (
            <div className="px-6 py-2 border-b bg-muted/30">
              <div className="flex gap-2">
                <Button
                  variant={selectedView === 'squad' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView('squad')}
                >
                  Squad
                </Button>
                <Button
                  variant={selectedView === 'selection' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView('selection')}
                >
                  Selection
                </Button>
                <Button
                  variant={selectedView === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView('mobile')}
                >
                  Mobile View
                </Button>
              </div>
            </div>
          )}

          {/* Team Number Selector */}
          {eventTeams.length > 1 && (
            <div className="px-6 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Team:</span>
                <div className="flex gap-1">
                  {eventTeams.map((team) => (
                    <Button
                      key={team.team_number}
                      variant={selectedTeamNumber === team.team_number ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTeamNumberChange(team.team_number)}
                    >
                      Team {team.team_number}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Loading team selection...</p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                {/* Mobile-specific views */}
                {isMobile && selectedView === 'mobile' && (
                  <div className="p-4">
                    <MobileTeamSelectionView
                      event={event}
                      teamId={currentTeamId}
                      onOpenFullManager={() => setSelectedView('selection')}
                      isExpanded={true}
                    />
                  </div>
                )}

                {/* Squad Management View */}
                {(!isMobile || selectedView === 'squad') && (
                  <div className="p-6">
                    <AvailabilityDrivenSquadManagement
                      teamId={currentTeamId}
                      eventId={event?.id}
                      onSquadChange={handleSquadChange}
                      onCaptainChange={handleCaptainChange}
                    />
                  </div>
                )}

                {/* Team Selection View */}
                {(!isMobile || selectedView === 'selection') && (
                  <div className="p-6">
                    <TeamSelectionManager
                      event={event}
                      teamId={currentTeamId}
                      isOpen={isOpen}
                      onClose={onClose}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
