
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, Crown, CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { useAvailabilityBasedSquad } from '@/hooks/useAvailabilityBasedSquad';
import { toast } from 'sonner';

interface AvailabilityDrivenSquadManagementProps {
  teamId: string;
  eventId: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: any[]) => void;
  onCaptainChange?: (captainId: string) => void;
}

export const AvailabilityDrivenSquadManagement: React.FC<AvailabilityDrivenSquadManagementProps> = ({
  teamId,
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange,
}) => {
  const {
    availablePlayers,
    squadPlayers,
    loading,
    assignPlayerToSquad,
    removePlayerFromSquad,
    updateSquadRole,
    reload
  } = useAvailabilityBasedSquad(teamId, eventId);

  const [localCaptainId, setLocalCaptainId] = useState<string>(globalCaptainId || '');

  useEffect(() => {
    if (globalCaptainId) {
      setLocalCaptainId(globalCaptainId);
    }
  }, [globalCaptainId]);

  useEffect(() => {
    if (onSquadChange) {
      onSquadChange(squadPlayers);
    }
  }, [squadPlayers, onSquadChange]);

  const handleAddToSquad = async (playerId: string) => {
    try {
      await assignPlayerToSquad(playerId, 'player');
      toast.success('Player added to squad');
    } catch (error: any) {
      console.error('Error adding player to squad:', error);
      toast.error('Failed to add player to squad');
    }
  };

  const handleRemoveFromSquad = async (playerId: string) => {
    try {
      await removePlayerFromSquad(playerId);
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
      // First, remove captain role from current captain
      if (localCaptainId) {
        await updateSquadRole(localCaptainId, 'player');
      }
      
      // Then assign captain role to new player
      if (playerId) {
        await updateSquadRole(playerId, 'captain');
      }
      
      setLocalCaptainId(playerId);
      if (onCaptainChange) {
        onCaptainChange(playerId);
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
                <Select value={localCaptainId} onValueChange={handleCaptainChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Choose captain..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Captain</SelectItem>
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
                {squadPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${getAvailabilityColor(player.availabilityStatus)} bg-opacity-20`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback>{player.name?.substring(0, 2)?.toUpperCase()}</AvatarFallback>
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
            Available Players ({availablePlayers.filter(p => p.availabilityStatus === 'available').length} available, {availablePlayers.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availablePlayers.length > 0 ? (
            <div className="space-y-3">
              {availablePlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-opacity ${getAvailabilityColor(player.availabilityStatus)}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/api/placeholder/40/40`} />
                      <AvatarFallback>{player.name?.substring(0, 2)?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="secondary">#{player.squadNumber}</Badge>
                        <Badge variant="outline">{player.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getAvailabilityIcon(player.availabilityStatus)}
                        <Badge variant="outline" className={getAvailabilityBadgeColor(player.availabilityStatus)}>
                          {player.availabilityStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {player.availabilityStatus === 'available' ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAddToSquad(player.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add to Squad
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
              <p className="text-lg font-medium mb-2">No availability responses yet</p>
              <p className="text-sm">Send availability notifications to collect player responses</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
