
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, Crown, CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { useAvailabilityBasedSquad } from '@/hooks/useAvailabilityBasedSquad';
import { toast } from 'sonner';
import { formatPlayerName } from '@/utils/nameUtils';
import { SquadPlayer } from '@/types/teamSelection';

interface AvailabilityDrivenSquadManagementProps {
  teamId: string;
  eventId: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
  allTeamSelections?: any[];
  currentTeamIndex?: number;
  initialSquadPlayers?: SquadPlayer[];
}

export const AvailabilityDrivenSquadManagement: React.FC<AvailabilityDrivenSquadManagementProps> = ({
  teamId,
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange,
  allTeamSelections = [],
  currentTeamIndex = 0,
  initialSquadPlayers = [],
}) => {
  const {
    availablePlayers,
    squadPlayers: hookSquadPlayers,
    loading,
    assignPlayerToSquad,
    removePlayerFromSquad,
    reload
  } = useAvailabilityBasedSquad(teamId, eventId);

  // Use local state to manage squad for this specific team
  const [localSquadPlayers, setLocalSquadPlayers] = useState<SquadPlayer[]>([]);
  const [localCaptainId, setLocalCaptainId] = useState<string>(globalCaptainId || '');

  console.log('AvailabilityDrivenSquadManagement render:', {
    teamId,
    eventId,
    loading,
    availablePlayersCount: availablePlayers.length,
    hookSquadPlayersCount: hookSquadPlayers.length,
    localSquadPlayersCount: localSquadPlayers.length,
    initialSquadPlayersCount: initialSquadPlayers.length
  });

  // Initialize local squad from hook data or initial props
  useEffect(() => {
    if (hookSquadPlayers.length > 0) {
      console.log('Setting squad from hook data:', hookSquadPlayers);
      const squadPlayers = hookSquadPlayers.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squadNumber,
        type: player.type,
        availabilityStatus: player.availabilityStatus,
        squadRole: player.squadRole || 'player'
      }));
      setLocalSquadPlayers(squadPlayers);
    } else if (initialSquadPlayers.length > 0 && localSquadPlayers.length === 0) {
      console.log('Setting squad from initial props:', initialSquadPlayers);
      setLocalSquadPlayers(initialSquadPlayers);
    }
  }, [hookSquadPlayers, initialSquadPlayers]);

  // Update captain when global captain changes
  useEffect(() => {
    setLocalCaptainId(globalCaptainId || '');
  }, [globalCaptainId]);

  // Notify parent when local squad changes
  useEffect(() => {
    if (onSquadChange && localSquadPlayers.length >= 0) {
      console.log('Notifying parent of squad change:', localSquadPlayers);
      onSquadChange(localSquadPlayers);
    }
  }, [localSquadPlayers, onSquadChange]);

  // Check if a player is selected in other teams
  const isPlayerInOtherTeams = (playerId: string) => {
    return allTeamSelections.some((team, index) => 
      index !== currentTeamIndex && 
      team.squadPlayers?.some((p: any) => p.id === playerId)
    );
  };

  // Check if a player is in the current team's squad
  const isPlayerInCurrentSquad = (playerId: string) => {
    return localSquadPlayers.some(p => p.id === playerId);
  };

  const handleAddToSquad = async (player: any) => {
    try {
      console.log('Adding player to squad:', player.id);
      
      const newSquadPlayer: SquadPlayer = {
        id: player.id,
        name: player.name,
        squadNumber: player.squadNumber,
        type: player.type,
        availabilityStatus: player.availabilityStatus,
        squadRole: 'player'
      };
      
      setLocalSquadPlayers(prev => {
        const newSquad = [...prev, newSquadPlayer];
        console.log('Updated local squad after adding player:', newSquad);
        return newSquad;
      });
      
      // Also call the hook function to persist in database
      if (assignPlayerToSquad) {
        await assignPlayerToSquad(player.id, 'player');
      }
      
      toast.success('Player added to squad');
    } catch (error: any) {
      console.error('Error adding player to squad:', error);
      toast.error('Failed to add player to squad');
    }
  };

  const handleRemoveFromSquad = async (playerId: string) => {
    try {
      console.log('Removing player from squad:', playerId);
      
      setLocalSquadPlayers(prev => {
        const newSquad = prev.filter(p => p.id !== playerId);
        console.log('Updated local squad after removing player:', newSquad);
        return newSquad;
      });
      
      // Also call the hook function to remove from database
      if (removePlayerFromSquad) {
        await removePlayerFromSquad(playerId);
      }
      
      toast.success('Player removed from squad');
      
      // If this was the captain, clear captain selection
      if (playerId === localCaptainId) {
        setLocalCaptainId('');
        if (onCaptainChange) {
          onCaptainChange('');
        }
      }
    } catch (error: any) {
      console.error('Error removing player from squad:', error);
      toast.error('Failed to remove player from squad');
    }
  };

  const handleCaptainChange = async (playerId: string) => {
    try {
      const actualPlayerId = playerId === 'no-captain' ? '' : playerId;
      
      setLocalCaptainId(actualPlayerId);
      if (onCaptainChange) {
        onCaptainChange(actualPlayerId);
      }
      toast.success('Captain updated');
    } catch (error: any) {
      console.error('Error updating captain:', error);
      toast.error('Failed to update captain');
    }
  };

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unavailable':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-200';
      case 'unavailable':
        return 'bg-red-50 border-red-200 opacity-60';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getAvailabilityBadgeColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canAddToSquad = (status: string) => {
    return status === 'available' || status === 'pending';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading availability data...</p>
        </CardContent>
      </Card>
    );
  }

  const availableCount = availablePlayers.filter(p => p.availabilityStatus === 'available').length;
  const pendingCount = availablePlayers.filter(p => p.availabilityStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Current Squad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selected Squad ({localSquadPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localSquadPlayers.length > 0 ? (
            <div className="space-y-4">
              {/* Captain Selection */}
              <div className="pb-4 border-b">
                <label className="text-sm font-medium mb-2 block">Select Captain:</label>
                <Select value={localCaptainId || 'no-captain'} onValueChange={handleCaptainChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Choose captain..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-captain">No Captain</SelectItem>
                    {localSquadPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (#{player.squadNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Squad Players List */}
              <div className="space-y-3">
                {localSquadPlayers.map((player) => (
                  <div key={player.id} className={`flex items-center justify-between p-4 rounded-lg border ${getAvailabilityColor(player.availabilityStatus)} bg-opacity-20`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback>{formatPlayerName(player.name, 'initials')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.name}</span>
                          <Badge variant="secondary">#{player.squadNumber}</Badge>
                          {player.id === localCaptainId && (
                            <Badge className="bg-yellow-500 text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              Captain
                            </Badge>
                          )}
                          {isPlayerInOtherTeams(player.id) && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <Users className="h-3 w-3 mr-1" />
                              Multi-team
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getAvailabilityIcon(player.availabilityStatus)}
                          <Badge variant="outline" className={getAvailabilityBadgeColor(player.availabilityStatus)}>
                            {player.availabilityStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromSquad(player.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No players in squad yet</p>
              <p className="text-sm">Add players from the available list below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Players ({availableCount} available, {pendingCount} pending, {availablePlayers.length} total)
            {availablePlayers.length === 0 && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={reload}
                className="ml-auto"
              >
                Reload Players
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availablePlayers.length > 0 ? (
            <div className="space-y-3">
              {availablePlayers.map((player) => (
                <div key={player.id} className={`flex items-center justify-between p-4 rounded-lg border transition-opacity ${getAvailabilityColor(player.availabilityStatus)}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/api/placeholder/40/40`} />
                      <AvatarFallback>{formatPlayerName(player.name, 'initials')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="secondary">#{player.squadNumber}</Badge>
                        <Badge variant="outline">{player.type}</Badge>
                        {isPlayerInCurrentSquad(player.id) && (
                          <Badge variant="default" className="bg-blue-600 text-white">
                            In Squad
                          </Badge>
                        )}
                        {isPlayerInOtherTeams(player.id) && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <Users className="h-3 w-3 mr-1" />
                            Multi-team
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getAvailabilityIcon(player.availabilityStatus)}
                        <Badge variant="outline" className={getAvailabilityBadgeColor(player.availabilityStatus)}>
                          {player.availabilityStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {!isPlayerInCurrentSquad(player.id) && canAddToSquad(player.availabilityStatus) ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAddToSquad(player)}
                      className={player.availabilityStatus === 'available' 
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add to Squad
                    </Button>
                  ) : isPlayerInCurrentSquad(player.id) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromSquad(player.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="capitalize">{player.availabilityStatus}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No players found</p>
              <p className="text-sm">
                {loading ? 'Loading players...' : 'No players available for this team. Try reloading or check your team roster.'}
              </p>
              {!loading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reload}
                  className="mt-4"
                >
                  Reload Players
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
