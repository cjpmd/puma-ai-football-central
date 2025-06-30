
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, UserMinus, Crown } from 'lucide-react';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { SquadPlayer } from '@/types/teamSelection';

interface SquadManagementProps {
  teamId: string;
  eventId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
}

export const SquadManagement: React.FC<SquadManagementProps> = ({ 
  teamId, 
  eventId,
  onSquadChange 
}) => {
  const {
    squadPlayers,
    loading: squadLoading,
    addPlayerToSquad,
    removePlayerFromSquad,
    updatePlayerAvailability
  } = useSquadManagement(teamId, eventId);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Get all team players for adding to squad
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['team-players', teamId],
    queryFn: () => playersService.getActivePlayersByTeamId(teamId),
    enabled: !!teamId,
  });

  // Filter out players already in squad
  const availableToAdd = allPlayers.filter(
    player => !squadPlayers.some(squadPlayer => squadPlayer.id === player.id)
  );

  const handleAddPlayer = async () => {
    if (!selectedPlayerId) return;
    
    try {
      await addPlayerToSquad(selectedPlayerId);
      setSelectedPlayerId('');
      onSquadChange?.(squadPlayers);
    } catch (error) {
      console.error('Error adding player to squad:', error);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      await removePlayerFromSquad(playerId);
      onSquadChange?.(squadPlayers);
    } catch (error) {
      console.error('Error removing player from squad:', error);
    }
  };

  const handleAvailabilityChange = async (playerId: string, status: string) => {
    try {
      await updatePlayerAvailability(playerId, status as 'available' | 'unavailable' | 'pending' | 'maybe');
      onSquadChange?.(squadPlayers);
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'maybe': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (squadLoading) {
    return <div className="text-center py-4">Loading squad...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Squad Management
          <Badge variant="secondary">{squadPlayers.length} players</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Player Section */}
        {availableToAdd.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select player to add to squad..." />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    #{player.squadNumber} {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddPlayer} 
              disabled={!selectedPlayerId}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {/* Squad Players List */}
        <div className="space-y-2">
          {squadPlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No players in squad. Add players to get started.
            </div>
          ) : (
            squadPlayers.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{player.squadNumber}</Badge>
                  <span className="font-medium">{player.name}</span>
                  {player.squadRole === 'captain' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  {player.type === 'goalkeeper' && (
                    <Badge variant="secondary">GK</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={player.availabilityStatus}
                    onValueChange={(value) => handleAvailabilityChange(player.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="maybe">Maybe</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Badge className={getAvailabilityColor(player.availabilityStatus)}>
                    {player.availabilityStatus}
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemovePlayer(player.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
