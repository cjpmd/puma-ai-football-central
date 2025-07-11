
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, UserPlus, UserMinus, Crown, AlertTriangle, Filter } from 'lucide-react';
import { useSquadManagement } from '@/hooks/useSquadManagement';
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { SquadPlayer } from '@/types/teamSelection';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { userAvailabilityService } from '@/services/userAvailabilityService';
import { supabase } from '@/integrations/supabase/client';

interface SquadManagementProps {
  teamId: string;
  eventId?: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
}

interface PlayerWithAvailability extends SquadPlayer {
  availabilityForEvent?: 'available' | 'unavailable' | 'pending';
  isAssignedElsewhere?: boolean;
}

export const SquadManagement: React.FC<SquadManagementProps> = ({ 
  teamId, 
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange
}) => {
  const isMobile = useMobileDetection();
  const {
    squadPlayers,
    loading: squadLoading,
    addPlayerToSquad,
    removePlayerFromSquad,
    updatePlayerAvailability
  } = useSquadManagement(teamId, eventId);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'availability' | 'position'>('availability');
  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'unavailable' | 'pending'>('all');
  const [playersWithAvailability, setPlayersWithAvailability] = useState<PlayerWithAvailability[]>([]);

  // Get all team players for adding to squad
  const { data: allPlayers = [], isLoading: playersLoading, error: playersError } = useQuery({
    queryKey: ['team-players', teamId],
    queryFn: () => playersService.getActivePlayersByTeamId(teamId),
    enabled: !!teamId,
  });

  // Load availability data for current event
  useEffect(() => {
    if (eventId && squadPlayers.length > 0) {
      loadPlayerAvailability();
    } else {
      setPlayersWithAvailability(squadPlayers.map(p => ({ ...p })));
    }
  }, [squadPlayers, eventId]);

  // Notify parent when squadPlayers changes
  useEffect(() => {
    onSquadChange?.(squadPlayers);
  }, [squadPlayers, onSquadChange]);

  const loadPlayerAvailability = async () => {
    if (!eventId) return;

    try {
      // Get user accounts linked to players
      const { data: userPlayers, error } = await supabase
        .from('user_players')
        .select('player_id, user_id')
        .in('player_id', squadPlayers.map(p => p.id));

      if (error) throw error;

      const userIds = userPlayers?.map(up => up.user_id) || [];
      
      if (userIds.length > 0) {
        const availability = await userAvailabilityService.getUserAvailabilityForEvents(
          userIds[0], // This would need to be improved for multiple users
          [eventId]
        );

        // Check for conflicts with other events on the same day
        const { data: eventData } = await supabase
          .from('events')
          .select('date')
          .eq('id', eventId)
          .single();

        let conflictingEventIds: string[] = [];
        if (eventData) {
          const { data: samedayEvents } = await supabase
            .from('events')
            .select('id')
            .eq('date', eventData.date)
            .eq('team_id', teamId)
            .neq('id', eventId);

          conflictingEventIds = samedayEvents?.map(e => e.id) || [];
        }

        const enhancedPlayers = squadPlayers.map(player => {
          const userPlayer = userPlayers?.find(up => up.player_id === player.id);
          const playerAvailability = availability.find(a => a.eventId === eventId);
          
          return {
            ...player,
            availabilityForEvent: playerAvailability?.status || 'pending',
            isAssignedElsewhere: false // Would check against conflictingEventIds
          };
        });

        setPlayersWithAvailability(enhancedPlayers);
      } else {
        setPlayersWithAvailability(squadPlayers.map(p => ({ ...p })));
      }
    } catch (error) {
      console.error('Error loading player availability:', error);
      setPlayersWithAvailability(squadPlayers.map(p => ({ ...p })));
    }
  };

  // Sort players based on selected criteria
  const sortedPlayers = [...playersWithAvailability].sort((a, b) => {
    switch (sortBy) {
      case 'availability':
        const availabilityOrder = { available: 0, pending: 1, unavailable: 2 };
        return availabilityOrder[a.availabilityForEvent || 'pending'] - 
               availabilityOrder[b.availabilityForEvent || 'pending'];
      case 'position':
        return (a.type || '').localeCompare(b.type || '');
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Filter players based on availability
  const filteredPlayers = sortedPlayers.filter(player => {
    if (filterBy === 'all') return true;
    return player.availabilityForEvent === filterBy;
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
      
      // Refresh availability data
      if (eventId) {
        loadPlayerAvailability();
      }
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

  const getAvailabilityColorForEvent = (status?: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'unavailable': return 'text-red-600';
      case 'pending': return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  if (squadLoading || playersLoading) {
    return (
      <Card>
        <CardContent className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className={isMobile ? 'text-sm' : ''}>Loading squad...</p>
        </CardContent>
      </Card>
    );
  }

  if (playersError) {
    return (
      <Card>
        <CardContent className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
          <p className={`text-red-600 ${isMobile ? 'text-sm' : ''}`}>Error loading players: {playersError.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
        {/* Team Captain Selection */}
        <Card>
          <CardHeader className={`${isMobile ? 'pb-2 px-3 pt-3' : 'pb-3'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
              <Crown className={`text-yellow-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              Team Captain
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'pt-0 px-3 pb-3' : 'pt-0'}`}>
            <Select value={globalCaptainId || ''} onValueChange={handleCaptainChange}>
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

        {/* Squad Management */}
        <Card>
          <CardHeader className={isMobile ? 'px-3 pt-3 pb-2' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : ''}`}>
              <Users className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Squad Management
              <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{squadPlayers.length} players</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isMobile ? 'px-3 pb-3' : 'space-y-4'}`}>
            {/* Sort and Filter Controls */}
            {eventId && (
              <div className={`flex gap-2 ${isMobile ? 'flex-col space-y-2' : ''}`}>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'w-40'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="availability">Sort by Availability</SelectItem>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="position">Sort by Position</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'w-40'}`}>
                    <Filter className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Add Player Section */}
            {availableToAdd.length > 0 ? (
              <div className={`flex gap-2 ${isMobile ? 'flex-col space-y-2' : ''}`}>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'flex-1'}`}>
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
                  className={isMobile ? 'w-full' : ''}
                >
                  <UserPlus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                  Add
                </Button>
              </div>
            ) : (
              <div className={`text-center text-muted-foreground ${isMobile ? 'py-3 text-sm' : 'py-4'}`}>
                {allPlayers.length === 0 
                  ? 'No players found in this team'
                  : 'All players are already in the squad'
                }
              </div>
            )}

            {/* Squad Players List */}
            <div className={`space-y-2 ${isMobile ? 'space-y-1' : ''}`}>
              {filteredPlayers.length === 0 ? (
                <div className={`text-center text-muted-foreground ${isMobile ? 'py-4 text-sm' : 'py-8'}`}>
                  {squadPlayers.length === 0 
                    ? 'No players in squad. Add players to get started.'
                    : 'No players match the current filter.'
                  }
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div key={player.id} className={`flex items-center justify-between border rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
                    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                      <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>#{player.squadNumber}</Badge>
                      <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{player.name}</span>
                      {player.id === globalCaptainId && (
                        <Crown className={`text-yellow-500 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                      )}
                      {player.type === 'goalkeeper' && (
                        <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>GK</Badge>
                      )}
                      {eventId && (
                        <div className={`flex items-center gap-1 ${getAvailabilityColorForEvent(player.availabilityForEvent)}`}>
                          <div className={`w-2 h-2 rounded-full ${
                            player.availabilityForEvent === 'available' ? 'bg-green-500' :
                            player.availabilityForEvent === 'unavailable' ? 'bg-red-500' :
                            'bg-amber-500'
                          }`} />
                          {player.isAssignedElsewhere && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-orange-500`} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Assigned to multiple events</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      <Select
                        value={player.availabilityStatus}
                        onValueChange={(value) => handleAvailabilityChange(player.id, value)}
                      >
                        <SelectTrigger className={isMobile ? 'w-24 h-7 text-xs' : 'w-32'}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                          <SelectItem value="maybe">Maybe</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Badge className={`${getAvailabilityColor(player.availabilityStatus)} ${isMobile ? 'text-xs px-1 py-0' : ''}`}>
                        {isMobile ? player.availabilityStatus.substring(0, 4) : player.availabilityStatus}
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePlayer(player.id)}
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
    </TooltipProvider>
  );
};
