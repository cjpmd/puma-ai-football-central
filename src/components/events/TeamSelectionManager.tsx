
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { FormationSelector } from './FormationSelector';
import { StaffSelectionSection } from './StaffSelectionSection';
import { DatabaseEvent } from '@/types/event';
import { GameFormat } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TeamSelectionManagerProps {
  eventId?: string;
  event: DatabaseEvent;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerTimeData {
  totalPlaying: number;
  totalSubstitute: number;
  periods: { period: number; minutes: number; type: 'playing' | 'substitute'; position: string; }[];
  playingPeriods: { period: number; minutes: number; position: string; }[];
  substitutePeriods: { period: number; minutes: number; position: string; }[];
}

interface Team {
  id: string;
  name: string;
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({ 
  event, 
  isOpen, 
  onClose 
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<string>('');
  const [activeTab, setActiveTab] = useState<"overview" | "formation" | "staff" | "playing-time">("overview");
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [currentSelection, setCurrentSelection] = useState<any>(null);
  const { teams: userTeams } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadEventData();
  }, [event.id]);

  useEffect(() => {
    if (teams.length > 0) {
      setActiveTeam(teams[0].id);
    }
  }, [teams]);

  const loadEventData = async () => {
    try {
      // Load available players for the event
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', event.team_id);

      if (playersError) throw playersError;
      setAvailablePlayers(playersData || []);

      // Load existing team selection if available - using correct table name
      const { data: selectionData, error: selectionError } = await supabase
        .from('event_selections')
        .select('*')
        .eq('event_id', event.id)
        .single();

      if (selectionError && selectionError.code !== 'PGRST116') throw selectionError;
      setCurrentSelection(selectionData || {
        event_id: event.id,
        team_id: event.team_id,
        formation: '',
        player_positions: [],
        substitute_players: [],
        tactical_notes: '',
        staff_assignments: [],
        captain_id: null
      });

      // Load teams associated with the event
      const { data: eventTeamsData, error: eventTeamsError } = await supabase
        .from('event_teams')
        .select('team_id')
        .eq('event_id', event.id);

      if (eventTeamsError) throw eventTeamsError;

      if (eventTeamsData && eventTeamsData.length > 0) {
        const teamIds = eventTeamsData.map(et => et.team_id);
        const eventTeams = userTeams.filter(team => teamIds.includes(team.id));
        setTeams(eventTeams.map(team => ({ id: team.id, name: team.name })));
      } else {
        const primaryTeam = userTeams.find(t => t.id === event.team_id);
        if (primaryTeam) {
          setTeams([{ id: primaryTeam.id, name: primaryTeam.name }]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading event data:', error);
      setLoading(false);
    }
  };

  const handleSelectionUpdate = async (updatedSelection: any) => {
    try {
      const { data, error } = await supabase
        .from('event_selections')
        .upsert(updatedSelection, { onConflict: 'event_id' })
        .select()
        .single();

      if (error) throw error;
      setCurrentSelection(data);
      toast({
        title: 'Selection Updated',
        description: 'Team selection has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating team selection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team selection.',
        variant: 'destructive',
      });
    }
  };

  const calculatePlayerTimeTracking = (selections: any[]) => {
    const playerTimes: { [playerId: string]: PlayerTimeData } = {};
    
    // Track processed periods to avoid duplicates
    const processedPeriods = new Set<string>();
    
    selections.forEach((selection) => {
      const { player_positions = [], substitute_players = [], duration_minutes = 0, period_number = 1 } = selection;
      
      // Create unique key for this period
      const periodKey = `${selection.event_id}-${period_number}`;
      
      // Skip if we've already processed this period
      if (processedPeriods.has(periodKey)) {
        return;
      }
      processedPeriods.add(periodKey);
      
      // Process playing positions (exclude substitutes)
      player_positions.forEach((pos: any) => {
        const playerId = pos.playerId || pos.player_id;
        if (!playerId || pos.isSubstitute) return; // Skip substitutes in playing positions
        
        if (!playerTimes[playerId]) {
          playerTimes[playerId] = {
            totalPlaying: 0,
            totalSubstitute: 0,
            periods: [],
            playingPeriods: [],
            substitutePeriods: []
          };
        }
        
        playerTimes[playerId].totalPlaying += duration_minutes;
        playerTimes[playerId].periods.push({
          period: period_number,
          minutes: duration_minutes,
          type: 'playing',
          position: pos.position
        });
        playerTimes[playerId].playingPeriods.push({
          period: period_number,
          minutes: duration_minutes,
          position: pos.position
        });
      });
      
      // Process substitute players
      substitute_players.forEach((sub: any) => {
        const playerId = sub.playerId || sub.player_id;
        if (!playerId) return;
        
        if (!playerTimes[playerId]) {
          playerTimes[playerId] = {
            totalPlaying: 0,
            totalSubstitute: 0,
            periods: [],
            playingPeriods: [],
            substitutePeriods: []
          };
        }
        
        playerTimes[playerId].totalSubstitute += duration_minutes;
        playerTimes[playerId].periods.push({
          period: period_number,
          minutes: duration_minutes,
          type: 'substitute',
          position: 'SUB'
        });
        playerTimes[playerId].substitutePeriods.push({
          period: period_number,
          minutes: duration_minutes,
          position: 'SUB'
        });
      });
    });
    
    return playerTimes;
  };

  const loadTeamData = async (teamId: string) => {
    try {
      // Fetch players for the selected team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId);

      if (playersError) throw playersError;
      setAvailablePlayers(players || []);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "overview" | "formation" | "staff" | "playing-time");
  };

  if (loading) {
    return <div className="text-center py-4">Loading event data...</div>;
  }

  if (!event) {
    return <div className="text-center py-4">Event not found.</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[90vh] max-w-7xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Team Selection - {event.title}</h2>
          <Button variant="ghost" onClick={onClose}>×</Button>
        </div>
        
        <div className="h-[calc(90vh-80px)] overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <TabsList className="w-full justify-start px-4 flex-shrink-0">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <span>📋</span> List View
              </TabsTrigger>
              <TabsTrigger value="formation" className="flex items-center gap-2">
                <span>🏟️</span> Formation View
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <span>👥</span> Staff Selection
              </TabsTrigger>
              <TabsTrigger value="playing-time" className="flex items-center gap-2">
                <span>⏱️</span> Playing Time
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full m-0 p-4 overflow-auto">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Player Selection</h3>
                  <PlayerSelectionWithAvailability
                    event={event}
                    availablePlayers={availablePlayers}
                    selectedPlayers={currentSelection?.player_positions || []}
                    substitutePlayers={currentSelection?.substitute_players || []}
                    formation={currentSelection?.formation}
                    captainId={currentSelection?.captain_id}
                    onPlayersChange={(players: any[], subs: any[], captain: any) => {
                      handleSelectionUpdate({
                        ...currentSelection,
                        player_positions: players,
                        substitute_players: subs,
                        captain_id: captain
                      });
                    }}
                    gameFormat={event.game_format as GameFormat}
                  />
                </div>
              </TabsContent>

              <TabsContent value="formation" className="h-full m-0 p-4 overflow-auto">
                <div className="space-y-6">
                  <FormationSelector
                    gameFormat={event.game_format as GameFormat}
                    selectedFormation={currentSelection?.formation || ''}
                    onFormationChange={(formationId) => {
                      if (currentSelection) {
                        handleSelectionUpdate({
                          ...currentSelection,
                          formation: formationId
                        });
                      }
                    }}
                  />
                  
                  {currentSelection && (
                    <PlayerSelectionWithAvailability
                      event={event}
                      availablePlayers={availablePlayers}
                      selectedPlayers={currentSelection.player_positions || []}
                      substitutePlayers={currentSelection.substitute_players || []}
                      formation={currentSelection.formation}
                      captainId={currentSelection.captain_id}
                      onPlayersChange={(players: any[], subs: any[], captain: any) => {
                        handleSelectionUpdate({
                          ...currentSelection,
                          player_positions: players,
                          substitute_players: subs,
                          captain_id: captain
                        });
                      }}
                      gameFormat={event.game_format as GameFormat}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="staff" className="h-full m-0 p-4 overflow-auto">
                <StaffSelectionSection
                  teamId={event.team_id}
                  selectedStaff={currentSelection?.staff_assignments || []}
                  onStaffChange={(staff) => {
                    handleSelectionUpdate({
                      ...currentSelection,
                      staff_assignments: staff
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="playing-time" className="h-full m-0 p-4 overflow-auto">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Playing Time Analysis</h3>
                  {currentSelection && (
                    <>
                      <p>
                        Here you can analyze the playing time for each player based on the current team selection.
                      </p>
                      {Object.entries(calculatePlayerTimeTracking([currentSelection])).map(([playerId, timeData]) => {
                        const player = availablePlayers.find(p => p.id === playerId);
                        return (
                          <div key={playerId} className="mb-4 p-4 border rounded-lg">
                            <p className="font-semibold">{player?.name || `Player ID: ${playerId}`}</p>
                            <p>Total Playing Time: {timeData.totalPlaying} minutes</p>
                            <p>Total Substitute Time: {timeData.totalSubstitute} minutes</p>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Playing Periods:</p>
                              {timeData.playingPeriods.map((period, index) => (
                                <span key={index} className="inline-block mr-2 text-xs bg-green-100 px-2 py-1 rounded">
                                  P{period.period}: {period.minutes}min ({period.position})
                                </span>
                              ))}
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Substitute Periods:</p>
                              {timeData.substitutePeriods.map((period, index) => (
                                <span key={index} className="inline-block mr-2 text-xs bg-yellow-100 px-2 py-1 rounded">
                                  P{period.period}: {period.minutes}min (SUB)
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
