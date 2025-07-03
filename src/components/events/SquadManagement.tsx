
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, UserMinus, Crown } from 'lucide-react';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { SquadPlayer } from '@/types/teamSelection';
import { toast } from 'sonner';

interface SquadManagementProps {
  teamId: string;
  eventId?: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
}

export const SquadManagement: React.FC<SquadManagementProps> = ({ 
  teamId, 
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange
}) => {
  const {
    squadPlayers,
    loading: squadLoading,
    addPlayerToSquad,
    removePlayerFromSquad,
    updatePlayerAvailability
  } = useSquadManagement(teamId, eventId);

  // Notify parent when squadPlayers changes
  useEffect(() => {
    onSquadChange?.(squadPlayers);
  }, [squadPlayers, onSquadChange]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Get all team players for adding to squad
  const { data: allPlayers = [], isLoading: playersLoading, error: playersError } = useQuery({
    queryKey: ['team-players', teamId],
    queryFn: () => playersService.getActivePlayersByTeamId(teamId),
    enabled: !!teamId,
  });

  console.log('SquadManagement render:', {
    teamId,
    eventId,
    squadPlayers: squadPlayers.length,
    allPlayers: allPlayers.length,
    playersLoading,
    playersError
  });

  // Filter out players already in squad
  const availableToAdd = allPlayers.filter(
    player => !squadPlayers.some(squadPlayer => squadPlayer.id === player.id)
  );

  console.log('Available players to add:', availableToAdd.length);

  const handleAddPlayer = async () => {
    if (!selectedPlayerId) {
      toast.error('Please select a player to add');
      return;
    }
    
    try {
      console.log('Adding player to squad:', selectedPlayerId);
      await addPlayerToSquad(selectedPlayerId);
      setSelectedPlayerId('');
      toast.success('Player added to squad successfully');
    } catch (error: any) {
      console.error('Error adding player to squad:', error);
      toast.error(error.message || 'Failed to add player to squad');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      console.log('Removing player from squad:', playerId);
      await removePlayerFromSquad(playerId);
      toast.success('Player removed from squad');
    } catch (error: any) {
      console.error('Error removing player from squad:', error);
      toast.error(error.message || 'Failed to remove player from squad');
    }
  };

  const handleAvailabilityChange = async (playerId: string, status: string) => {
    try {
      console.log('Updating availability:', { playerId, status });
      await updatePlayerAvailability(playerId, status as 'available' | 'unavailable' | 'pending' | 'maybe');
      toast.success('Availability updated');
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast.error(error.message || 'Failed to update availability');
    }
  };

  const handleCaptainChange = (captainId: string) => {
    onCaptainChange?.(captainId);
    toast.success('Captain updated');
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'maybe': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (squadLoading || playersLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading squad...</p>
        </CardContent>
      </Card>
    );
  }

  if (playersError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-red-600">Error loading players: {playersError.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Captain Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-yellow-500" />
            Team Captain
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={globalCaptainId || ''} onValueChange={handleCaptainChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select captain..." />
            </SelectTrigger>
            <SelectContent>
              {squadPlayers
                .filter(p => p.availabilityStatus === 'available')
                .map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    #{player.squadNumber} {player.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Squad Management */}
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
          {availableToAdd.length > 0 ? (
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
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {allPlayers.length === 0 
                ? 'No players found in this team'
                : 'All players are already in the squad'
              }
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
                    {player.id === globalCaptainId && (
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
    </div>
  );
};
