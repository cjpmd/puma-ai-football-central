import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, AlertTriangle } from 'lucide-react';
import { PlayerSelectionWithAvailability } from './PlayerSelectionWithAvailability';
import { StaffSelectionSection } from './StaffSelectionSection';
import { supabase } from '@/integrations/supabase/client';
import { GameFormat } from '@/types';

interface TeamSelectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  team: any;
  periods: any[];
  gameFormat: GameFormat;
  eventType: string;
}

interface Player {
  id: string;
  name: string;
  squad_number: number;
}

interface TeamData {
  [periodKey: string]: {
    players: string[];
    substitutes: string[];
    formation: string;
    captain: string;
  };
}

export const TeamSelectionManager: React.FC<TeamSelectionManagerProps> = ({
  isOpen,
  onClose,
  eventId,
  team,
  periods,
  gameFormat,
  eventType
}) => {
  const [teamData, setTeamData] = useState<TeamData>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
    loadPlayers();
  }, [eventId, team.team_number]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const initialTeamData: TeamData = {};

      // Fetch existing team data for all periods
      const { data, error } = await supabase
        .from('event_teams_periods')
        .select('*')
        .eq('event_id', eventId)
        .eq('team_number', team.team_number);

      if (error) throw error;

      // Initialize teamData with fetched data
      periods.forEach(period => {
        const periodKey = `team_${team.team_number}_period_${period.period_number}`;
        const existingData = data?.find(item => item.period_number === period.period_number);

        initialTeamData[periodKey] = {
          players: existingData?.players || [],
          substitutes: existingData?.substitutes || [],
          formation: existingData?.formation || '1-4-4-2',
          captain: existingData?.captain_id || ''
        };
      });

      setTeamData(initialTeamData);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', team.id)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleDataChange = async (periodKey: string, newData: any) => {
    setTeamData(prevData => ({
      ...prevData,
      [periodKey]: newData
    }));

    // Optimistically update local state
    const periodNumber = parseInt(periodKey.split('_period_')[1]);

    try {
      // Update data in Supabase
      const { error } = await supabase
        .from('event_teams_periods')
        .upsert(
          {
            event_id: eventId,
            team_number: team.team_number,
            period_number: periodNumber,
            players: newData.players,
            substitutes: newData.substitutes,
            formation: newData.formation,
            captain_id: newData.captain
          },
          { onConflict: 'event_id, team_number, period_number' }
        );

      if (error) {
        console.error('Error updating team data:', error);
        // Revert local state if update fails
        setTeamData(prevData => ({ ...prevData }));
      }
    } catch (error) {
      console.error('Error updating team data:', error);
      // Revert local state if update fails
      setTeamData(prevData => ({ ...prevData }));
    }
  };

  const calculatePlayerTime = (playerId: string) => {
    let playingMinutes = 0;
    let substituteMinutes = 0;
    
    periods.forEach(period => {
      const periodKey = `team_${team.team_number}_period_${period.period_number}`;
      const periodData = teamData[periodKey];
      
      if (periodData) {
        // Check if player is in starting lineup (playing time)
        if (periodData.players.includes(playerId)) {
          playingMinutes += period.duration_minutes || 0;
        }
        // Check if player is substitute (substitute time - NOT playing time)
        else if (periodData.substitutes.includes(playerId)) {
          substituteMinutes += period.duration_minutes || 0;
        }
      }
    });
    
    return { playingMinutes, substituteMinutes };
  };

  const getPlayerTimeInfo = (playerId: string): string => {
    const { playingMinutes, substituteMinutes } = calculatePlayerTime(playerId);
    const totalTime = playingMinutes + substituteMinutes;
    
    if (totalTime === 0) return '';
    
    const parts = [];
    if (playingMinutes > 0) parts.push(`${playingMinutes}m playing`);
    if (substituteMinutes > 0) parts.push(`${substituteMinutes}m sub`);
    
    return parts.join(', ');
  };

  const renderPlayingTimeAnalysis = () => {
    if (players.length === 0) return null;

    const playerAnalysis = players.map(player => {
      const { playingMinutes, substituteMinutes } = calculatePlayerTime(player.id);
      return {
        player,
        playingMinutes,
        substituteMinutes,
        totalMinutes: playingMinutes + substituteMinutes
      };
    }).filter(analysis => analysis.totalMinutes > 0)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Playing Time Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {playerAnalysis.map(({ player, playingMinutes, substituteMinutes, totalMinutes }) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[50px] text-center">
                      #{player.squad_number}
                    </Badge>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <div className="text-sm text-right">
                    <div className="font-medium">Total: {totalMinutes}m</div>
                    <div className="text-muted-foreground">
                      Playing: {playingMinutes}m • Substitute: {substituteMinutes}m
                    </div>
                  </div>
                </div>
              ))}
              
              {playerAnalysis.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No players have been allocated time yet
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Team Selection - {team.name} (Team {team.team_number})
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="players" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="players">Player Selection</TabsTrigger>
            <TabsTrigger value="staff">Staff Selection</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(90vh-200px)]">
            <TabsContent value="players" className="space-y-6 mt-6">
              {periods.map((period) => {
                const periodKey = `team_${team.team_number}_period_${period.period_number}`;
                const periodData = teamData[periodKey] || {
                  players: [],
                  substitutes: [],
                  formation: '1-4-4-2',
                  captain: ''
                };

                return (
                  <Card key={period.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Period {period.period_number}</span>
                        <Badge variant="outline">
                          {period.duration_minutes}min
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PlayerSelectionWithAvailability
                        teamId={team.id}
                        eventId={eventId}
                        selectedPlayers={periodData.players}
                        substitutePlayers={periodData.substitutes}
                        captainId={periodData.captain}
                        onPlayersChange={(players) => handleDataChange(periodKey, { ...periodData, players })}
                        onSubstitutesChange={(substitutes) => handleDataChange(periodKey, { ...periodData, substitutes })}
                        onCaptainChange={(captain) => handleDataChange(periodKey, { ...periodData, captain })}
                        eventType={eventType}
                        formation={periodData.formation}
                        onFormationChange={(formation) => handleDataChange(periodKey, { ...periodData, formation })}
                        gameFormat={gameFormat}
                        teamNumber={team.team_number}
                        periodNumber={period.period_number}
                        getPlayerTimeInfo={getPlayerTimeInfo}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
            
            <TabsContent value="staff" className="space-y-6 mt-6">
              <StaffSelectionSection
                teamId={team.id}
                eventId={eventId}
                periods={periods}
                teamNumber={team.team_number}
              />
            </TabsContent>
            
            <TabsContent value="analysis" className="space-y-6 mt-6">
              {renderPlayingTimeAnalysis()}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
