
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FormationSelector } from './FormationSelector';
import { getPositionsForFormation } from '@/utils/formationUtils';
import { GameFormat } from '@/types';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  subscription_type: string;
  subscription_status: string;
  status: string;
}

interface PlayerSelectionWithAvailabilityProps {
  eventId: string;
  teamId: string;
  formation: string;
  gameFormat: GameFormat;
  selectedPlayers: { [position: string]: string };
  onPlayersChange: (players: { [position: string]: string }) => void;
  substitutePlayers: string[];
  onSubstitutesChange: (subs: string[]) => void;
  captainId: string;
  onCaptainChange: (captainId: string) => void;
}

export const PlayerSelectionWithAvailability: React.FC<PlayerSelectionWithAvailabilityProps> = ({
  eventId,
  teamId,
  formation,
  gameFormat,
  selectedPlayers,
  onPlayersChange,
  substitutePlayers = [],
  onSubstitutesChange,
  captainId,
  onCaptainChange
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerAvailabilities, setPlayerAvailabilities] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPlayers();
    loadPlayerAvailabilities();
  }, [teamId, eventId]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number, subscription_type, subscription_status, status')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number', { ascending: true });

      if (error) throw error;

      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerAvailabilities = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('event_availability')
        .select('user_id, status')
        .eq('event_id', eventId)
        .eq('role', 'player');

      if (error) throw error;

      const availabilityMap: Record<string, string> = {};
      (data || []).forEach(availability => {
        availabilityMap[availability.user_id] = availability.status;
      });
      
      setPlayerAvailabilities(availabilityMap);
    } catch (error) {
      console.error('Error loading player availabilities:', error);
    }
  };

  const getAvailablePlayersForFormation = () => {
    return players.filter(player => {
      const availability = playerAvailabilities[player.id];
      return availability !== 'unavailable';
    });
  };

  const handlePositionPlayerChange = (position: string, playerId: string) => {
    const newSelectedPlayers = { ...selectedPlayers };
    
    if (playerId === 'none') {
      delete newSelectedPlayers[position];
    } else {
      newSelectedPlayers[position] = playerId;
    }
    
    onPlayersChange(newSelectedPlayers);
  };

  const handleSubstituteChange = (playerId: string) => {
    if (!playerId || playerId === 'none') return;
    
    const newSubstitutes = substitutePlayers.includes(playerId)
      ? substitutePlayers.filter(id => id !== playerId)
      : [...substitutePlayers, playerId];
    
    onSubstitutesChange(newSubstitutes);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading players...</div>
        </CardContent>
      </Card>
    );
  }

  const positions = getPositionsForFormation(formation, gameFormat);
  const availablePlayers = getAvailablePlayersForFormation();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {positions.map((position) => (
          <div key={position} className="flex items-center gap-3">
            <div className="w-12 text-sm font-medium">{position}</div>
            <Select
              value={selectedPlayers[position] || 'none'}
              onValueChange={(value) => handlePositionPlayerChange(position, value)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="No Player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Player</SelectItem>
                {availablePlayers.map((player) => {
                  const availability = playerAvailabilities[player.id];
                  
                  return (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        #{player.squad_number} {player.name}
                        {player.subscription_type !== 'full_squad' && (
                          <span className="text-xs text-muted-foreground">
                            ({player.subscription_type})
                          </span>
                        )}
                        {availability === 'pending' && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {captainId === selectedPlayers[position] && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        ))}
        
        <div className="mt-4 space-y-2">
          <label>Captain</label>
          <Select value={captainId || 'none'} onValueChange={(value) => onCaptainChange(value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="No Captain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Captain</SelectItem>
              {Object.values(selectedPlayers).filter(id => id !== '').map((playerId) => {
                const player = players.find(p => p.id === playerId);
                return player ? (
                  <SelectItem key={player.id} value={player.id}>
                    #{player.squad_number} {player.name}
                  </SelectItem>
                ) : null;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-sm font-medium">Substitutes</label>
          <div className="space-y-2">
            {substitutePlayers.map((playerId) => {
              const player = players.find(p => p.id === playerId);
              const availability = playerAvailabilities[playerId];
              
              return player ? (
                <div key={playerId} className="flex items-center gap-2 p-2 border rounded">
                  <span className="text-sm">#{player.squad_number} {player.name}</span>
                  {availability === 'pending' && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                      Pending
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSubstitutes = substitutePlayers.filter(id => id !== playerId);
                      onSubstitutesChange(newSubstitutes);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : null;
            })}
            
            <Select onValueChange={handleSubstituteChange}>
              <SelectTrigger>
                <SelectValue placeholder="Add substitute" />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers
                  .filter(player => !Object.values(selectedPlayers).includes(player.id) && !substitutePlayers.includes(player.id))
                  .map((player) => {
                    const availability = playerAvailabilities[player.id];
                    
                    return (
                      <SelectItem key={player.id} value={player.id}>
                        <div className="flex items-center gap-2">
                          #{player.squad_number} {player.name}
                          {availability === 'pending' && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
