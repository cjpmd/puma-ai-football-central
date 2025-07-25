
import { useState, useEffect, useCallback, useMemo } from 'react';
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
}) => {
  const {
    availablePlayers,
    squadPlayers,
    loading,
    assignPlayerToSquad,
    removePlayerFromSquad,
    reload
  } = useAvailabilityBasedSquad(teamId, eventId, currentTeamIndex);

  const [localCaptainId, setLocalCaptainId] = useState<string>(globalCaptainId || '');

  console.log('AvailabilityDrivenSquadManagement render:', {
    teamId,
    eventId,
    currentTeamIndex,
    loading,
    availablePlayersCount: availablePlayers.length,
    squadPlayersCount: squadPlayers.length
  });

  // Update captain when global captain changes
  useEffect(() => {
    if (globalCaptainId !== localCaptainId) {
      setLocalCaptainId(globalCaptainId || '');
    }
  }, [globalCaptainId, localCaptainId]);

  // Format squad players for parent component
  const squadPlayersFormatted = useMemo(() => {
    return squadPlayers
      .map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squadNumber,
        type: player.type,
        availabilityStatus: player.availabilityStatus,
        squadRole: (player.squadRole || 'player') as 'player' | 'captain' | 'vice_captain'
      }))
      .sort((a, b) => {
        // Primary sort: availability status (available -> pending -> unavailable)
        const availabilityOrder = { available: 1, pending: 2, unavailable: 3 };
        const aOrder = availabilityOrder[a.availabilityStatus as keyof typeof availabilityOrder] || 4;
        const bOrder = availabilityOrder[b.availabilityStatus as keyof typeof availabilityOrder] || 4;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        // Secondary sort: squad number
        return a.squadNumber - b.squadNumber;
      });
  }, [squadPlayers]);

  // Notify parent component when squad changes
  useEffect(() => {
    if (!loading && onSquadChange) {
      console.log('Notifying parent of squad change:', squadPlayersFormatted);
      onSquadChange(squadPlayersFormatted);
    }
  }, [squadPlayersFormatted, loading, onSquadChange]);

  // Check if a player is selected in other teams
  const isPlayerInOtherTeams = useCallback((playerId: string) => {
    return allTeamSelections.some((team, index) => 
      index !== currentTeamIndex && 
      team.squadPlayers?.some((p: any) => p.id === playerId)
    );
  }, [allTeamSelections, currentTeamIndex]);

  const handleAddToSquad = useCallback(async (player: any) => {
    try {
      console.log('Adding player to squad:', player.id);
      await assignPlayerToSquad(player.id, 'player');
      toast.success(`${player.name} added to squad`);
    } catch (error: any) {
      console.error('Error adding player to squad:', error);
      toast.error(`Failed to add ${player.name}: ${error.message}`);
    }
  }, [assignPlayerToSquad]);

  const handleRemoveFromSquad = useCallback(async (playerId: string) => {
    try {
      const playerName = squadPlayers.find(p => p.id === playerId)?.name || 'Player';
      console.log('Removing player from squad:', playerId);
      await removePlayerFromSquad(playerId);
      toast.success(`${playerName} removed from squad`);
      
      // If this was the captain, clear captain selection
      if (playerId === localCaptainId) {
        setLocalCaptainId('');
        if (onCaptainChange) {
          onCaptainChange('');
        }
      }
    } catch (error: any) {
      console.error('Error removing player from squad:', error);
      const playerName = squadPlayers.find(p => p.id === playerId)?.name || 'Player';
      toast.error(`Failed to remove ${playerName}: ${error.message}`);
    }
  }, [removePlayerFromSquad, localCaptainId, onCaptainChange, squadPlayers]);

  const handleCaptainChange = useCallback(async (playerId: string) => {
    try {
      const actualPlayerId = playerId === 'no-captain' ? '' : playerId;
      
      setLocalCaptainId(actualPlayerId);
      if (onCaptainChange) {
        onCaptainChange(actualPlayerId);
      }
      
      const playerName = actualPlayerId ? squadPlayers.find(p => p.id === actualPlayerId)?.name : 'None';
      toast.success(`Captain updated: ${playerName}`);
    } catch (error: any) {
      console.error('Error updating captain:', error);
      toast.error('Failed to update captain');
    }
  }, [onCaptainChange, squadPlayers]);

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
          <p>Loading squad data...</p>
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
            Selected Squad ({squadPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {squadPlayers.length > 0 ? (
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
                    {squadPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (#{player.squadNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Squad Players List */}
              <div className="space-y-3">
                {squadPlayers
                  .sort((a, b) => {
                    // Primary sort: availability status (available -> pending -> unavailable)
                    const availabilityOrder = { available: 1, pending: 2, unavailable: 3 };
                    const aOrder = availabilityOrder[a.availabilityStatus as keyof typeof availabilityOrder] || 4;
                    const bOrder = availabilityOrder[b.availabilityStatus as keyof typeof availabilityOrder] || 4;
                    
                    if (aOrder !== bOrder) {
                      return aOrder - bOrder;
                    }
                    
                    // Secondary sort: squad number
                    return a.squadNumber - b.squadNumber;
                  })
                  .map((player) => (
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
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 md:px-4 px-2"
                    >
                      <X className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Remove</span>
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
              {availablePlayers
                .sort((a, b) => {
                  // Primary sort: availability status (available -> pending -> unavailable)
                  const availabilityOrder = { available: 1, pending: 2, unavailable: 3 };
                  const aOrder = availabilityOrder[a.availabilityStatus as keyof typeof availabilityOrder] || 4;
                  const bOrder = availabilityOrder[b.availabilityStatus as keyof typeof availabilityOrder] || 4;
                  
                  if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                  }
                  
                  // Secondary sort: squad number
                  return a.squadNumber - b.squadNumber;
                })
                .map((player) => (
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
                  
                  {canAddToSquad(player.availabilityStatus) ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAddToSquad(player)}
                      className={`md:px-4 px-2 ${player.availabilityStatus === 'available' 
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      <UserPlus className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Add to Squad</span>
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
