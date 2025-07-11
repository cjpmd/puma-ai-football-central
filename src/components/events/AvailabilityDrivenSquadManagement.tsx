
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, UserMinus, Crown, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAvailabilityBasedSquad, AvailablePlayer } from '@/hooks/useAvailabilityBasedSquad';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface AvailabilityDrivenSquadManagementProps {
  teamId: string;
  eventId: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: AvailablePlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
}

export const AvailabilityDrivenSquadManagement: React.FC<AvailabilityDrivenSquadManagementProps> = ({
  teamId,
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange
}) => {
  const isMobile = useMobileDetection();
  const {
    availablePlayers,
    squadPlayers,
    loading,
    assignPlayerToSquad,
    removePlayerFromSquad,
    updateSquadRole,
    reload
  } = useAvailabilityBasedSquad(teamId, eventId);

  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'unavailable' | 'pending'>('all');

  // Notify parent when squad changes
  useEffect(() => {
    onSquadChange?.(squadPlayers);
  }, [squadPlayers, onSquadChange]);

  // Filter available players based on availability status
  const filteredAvailablePlayers = availablePlayers.filter(player => {
    if (filterBy === 'all') return true;
    return player.availabilityStatus === filterBy;
  });

  const handleAssignToSquad = async (playerId: string) => {
    try {
      await assignPlayerToSquad(playerId);
      toast.success('Player added to squad');
      await reload();
    } catch (error: any) {
      console.error('Error assigning player:', error);
      toast.error(error.message || 'Failed to add player to squad');
    }
  };

  const handleRemoveFromSquad = async (playerId: string) => {
    try {
      await removePlayerFromSquad(playerId);
      toast.success('Player removed from squad');
      await reload();
    } catch (error: any) {
      console.error('Error removing player:', error);
      toast.error(error.message || 'Failed to remove player from squad');
    }
  };

  const handleRoleChange = async (playerId: string, role: string) => {
    try {
      await updateSquadRole(playerId, role as 'player' | 'captain' | 'vice_captain');
      toast.success('Player role updated');
      if (role === 'captain') {
        onCaptainChange?.(playerId);
      }
      await reload();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update player role');
    }
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'unavailable': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className={isMobile ? 'text-sm' : ''}>Loading availability data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
      {/* Team Captain Selection */}
      {squadPlayers.length > 0 && (
        <Card>
          <CardHeader className={`${isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
              <Crown className={`text-yellow-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              Team Captain
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'pt-0 px-3 pb-3' : 'pt-0'}`}>
            <Select value={globalCaptainId || ''} onValueChange={onCaptainChange}>
              <SelectTrigger className={isMobile ? 'h-8 text-sm' : 'h-8'}>
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
      )}

      {/* Available Players */}
      <Card>
        <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Available Players
            <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{filteredAvailablePlayers.length} players</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isMobile ? 'px-3 pb-3' : 'space-y-4'}`}>
          {/* Filter Controls */}
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'w-40'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="pending">Pending Response</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Available Players List */}
          <div className={`space-y-2 ${isMobile ? 'space-y-1' : ''}`}>
            {filteredAvailablePlayers.length === 0 ? (
              <div className={`text-center text-muted-foreground ${isMobile ? 'py-4 text-sm' : 'py-8'}`}>
                {availablePlayers.length === 0 
                  ? 'No players have set their availability yet. Send availability notifications first.'
                  : 'No players match the current filter'
                }
              </div>
            ) : (
              filteredAvailablePlayers.map((player) => (
                <div key={player.id} className={`flex items-center justify-between border rounded-lg ${isMobile ? 'p-2' : 'p-3'} ${player.availabilityStatus === 'available' ? 'bg-green-50 border-green-200' : player.availabilityStatus === 'unavailable' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>#{player.squadNumber}</Badge>
                    <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{player.name}</span>
                    {player.type === 'goalkeeper' && (
                      <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>GK</Badge>
                    )}
                    <div className="flex items-center gap-1">
                      {getAvailabilityIcon(player.availabilityStatus)}
                      <Badge className={`${getAvailabilityColor(player.availabilityStatus)} ${isMobile ? 'text-xs px-1 py-0' : ''}`}>
                        {isMobile ? player.availabilityStatus.substring(0, 4) : player.availabilityStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignToSquad(player.id)}
                    className={isMobile ? 'h-7 px-2' : ''}
                    disabled={player.availabilityStatus === 'unavailable'}
                  >
                    <UserPlus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                    {isMobile ? 'Add' : 'Add to Squad'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Squad Players */}
      <Card>
        <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
            <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Squad Selection
            <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{squadPlayers.length} players</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isMobile ? 'px-3 pb-3' : 'space-y-4'}`}>
          <div className={`space-y-2 ${isMobile ? 'space-y-1' : ''}`}>
            {squadPlayers.length === 0 ? (
              <div className={`text-center text-muted-foreground ${isMobile ? 'py-4 text-sm' : 'py-8'}`}>
                No players assigned to squad yet. Add players from the available list above.
              </div>
            ) : (
              squadPlayers.map((player) => (
                <div key={player.id} className={`flex items-center justify-between border rounded-lg ${isMobile ? 'p-2' : 'p-3'} ${player.availabilityStatus === 'available' ? 'bg-green-50 border-green-200' : player.availabilityStatus === 'unavailable' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>#{player.squadNumber}</Badge>
                    <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{player.name}</span>
                    {player.id === globalCaptainId && (
                      <Crown className={`text-yellow-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    )}
                    {player.type === 'goalkeeper' && (
                      <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>GK</Badge>
                    )}
                    <div className="flex items-center gap-1">
                      {getAvailabilityIcon(player.availabilityStatus)}
                      <Badge className={`${getAvailabilityColor(player.availabilityStatus)} ${isMobile ? 'text-xs px-1 py-0' : ''}`}>
                        {isMobile ? player.availabilityStatus.substring(0, 4) : player.availabilityStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                    <Select
                      value={player.squadRole}
                      onValueChange={(value) => handleRoleChange(player.id, value)}
                    >
                      <SelectTrigger className={isMobile ? 'w-20 h-7 text-xs' : 'w-32'}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="captain">Captain</SelectItem>
                        <SelectItem value="vice_captain">Vice Captain</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromSquad(player.id)}
                      className={isMobile ? 'h-7 w-7 p-0' : ''}
                    >
                      <UserMinus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
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
