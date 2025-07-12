
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, UserPlus, UserMinus, Crown, AlertTriangle, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { playersService } from '@/services/playersService';
import { SquadPlayer } from '@/types/teamSelection';
import { toast } from 'sonner';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { userAvailabilityService } from '@/services/userAvailabilityService';
import { supabase } from '@/integrations/supabase/client';

interface TeamSelection {
  teamNumber: number;
  squadPlayers: SquadPlayer[];
  periods: any[];
  globalCaptainId?: string;
  performanceCategory?: string;
}

interface AvailabilityDrivenSquadManagementProps {
  teamId: string;
  eventId?: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
  allTeamSelections?: TeamSelection[];
  currentTeamIndex?: number;
  initialSquadPlayers?: SquadPlayer[];
}

interface PlayerWithAvailability extends SquadPlayer {
  availabilityForEvent?: 'available' | 'unavailable' | 'pending';
  isAssignedElsewhere?: boolean;
  isInCurrentSquad?: boolean;
}

export const AvailabilityDrivenSquadManagement: React.FC<AvailabilityDrivenSquadManagementProps> = ({ 
  teamId, 
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange,
  allTeamSelections = [],
  currentTeamIndex = 0,
  initialSquadPlayers = []
}) => {
  const isMobile = useMobileDetection();
  const [squadPlayers, setSquadPlayers] = useState<SquadPlayer[]>(initialSquadPlayers);
  const [sortBy, setSortBy] = useState<'name' | 'availability' | 'position'>('availability');
  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'unavailable' | 'pending' | 'in_squad' | 'not_in_squad'>('all');
  const [playersWithAvailability, setPlayersWithAvailability] = useState<PlayerWithAvailability[]>([]);

  // Update local squad when initialSquadPlayers changes (when switching teams)
  useEffect(() => {
    console.log('Updating squad for team', currentTeamIndex + 1, 'with initial players:', initialSquadPlayers);
    setSquadPlayers(initialSquadPlayers);
  }, [initialSquadPlayers, currentTeamIndex]);

  // Get all team players
  const { data: allPlayers = [], isLoading: playersLoading, error: playersError } = useQuery({
    queryKey: ['team-players', teamId],
    queryFn: () => playersService.getActivePlayersByTeamId(teamId),
    enabled: !!teamId,
  });

  // Get players assigned to other teams
  const getPlayersAssignedToOtherTeams = () => {
    const assignedPlayerIds = new Set<string>();
    allTeamSelections.forEach((team, index) => {
      if (index !== currentTeamIndex) {
        team.squadPlayers.forEach(player => {
          assignedPlayerIds.add(player.id);
        });
      }
    });
    return assignedPlayerIds;
  };

  // Load availability data and combine with all players
  useEffect(() => {
    const loadPlayerData = async () => {
      if (!allPlayers.length) return;

      const playersInOtherTeams = getPlayersAssignedToOtherTeams();
      const squadPlayerIds = new Set(squadPlayers.map(p => p.id));

      let enhancedPlayers: PlayerWithAvailability[] = allPlayers.map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squadNumber,
        type: player.type as 'goalkeeper' | 'outfield',
        availabilityStatus: 'available',
        squadRole: 'player',
        availabilityForEvent: 'pending' as const,
        isAssignedElsewhere: playersInOtherTeams.has(player.id),
        isInCurrentSquad: squadPlayerIds.has(player.id)
      }));

      // Load availability data for current event if available
      if (eventId) {
        try {
          const { data: userPlayers, error } = await supabase
            .from('user_players')
            .select('player_id, user_id')
            .in('player_id', allPlayers.map(p => p.id));

          if (!error && userPlayers?.length > 0) {
            const userIds = userPlayers.map(up => up.user_id);
            
            if (userIds.length > 0) {
              const availability = await userAvailabilityService.getUserAvailabilityForEvents(
                userIds[0],
                [eventId]
              );

              enhancedPlayers = enhancedPlayers.map(player => {
                const playerAvailability = availability.find(a => a.eventId === eventId);
                return {
                  ...player,
                  availabilityForEvent: playerAvailability?.status || 'pending'
                };
              });
            }
          }
        } catch (error) {
          console.error('Error loading player availability:', error);
        }
      }

      setPlayersWithAvailability(enhancedPlayers);
    };

    loadPlayerData();
  }, [allPlayers, squadPlayers, eventId, allTeamSelections, currentTeamIndex]);

  // Notify parent when squadPlayers changes
  useEffect(() => {
    onSquadChange?.(squadPlayers);
  }, [squadPlayers, onSquadChange]);

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

  // Filter players based on availability and squad status
  const filteredPlayers = sortedPlayers.filter(player => {
    switch (filterBy) {
      case 'available':
        return player.availabilityForEvent === 'available';
      case 'unavailable':
        return player.availabilityForEvent === 'unavailable';
      case 'pending':
        return player.availabilityForEvent === 'pending';
      case 'in_squad':
        return player.isInCurrentSquad;
      case 'not_in_squad':
        return !player.isInCurrentSquad && !player.isAssignedElsewhere;
      case 'all':
      default:
        return true;
    }
  });

  console.log('AvailabilityDrivenSquadManagement render:', {
    teamId,
    eventId,
    squadPlayers: squadPlayers.length,
    allPlayers: allPlayers.length,
    currentTeamIndex,
    playersLoading,
    playersError
  });

  const handleAddPlayer = async (playerId: string) => {
    try {
      const playerToAdd = allPlayers.find(p => p.id === playerId);
      if (!playerToAdd) {
        toast.error('Player not found');
        return;
      }

      const newSquadPlayer: SquadPlayer = {
        id: playerToAdd.id,
        name: playerToAdd.name,
        squadNumber: playerToAdd.squadNumber,
        type: playerToAdd.type as 'goalkeeper' | 'outfield',
        availabilityStatus: 'available',
        squadRole: 'player'
      };

      console.log('Adding player to squad:', newSquadPlayer);
      setSquadPlayers(prev => [...prev, newSquadPlayer]);
      toast.success('Player added to squad successfully');
    } catch (error: any) {
      console.error('Error adding player to squad:', error);
      toast.error(error.message || 'Failed to add player to squad');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      console.log('Removing player from squad:', playerId);
      setSquadPlayers(prev => prev.filter(p => p.id !== playerId));
      toast.success('Player removed from squad');
    } catch (error: any) {
      console.error('Error removing player from squad:', error);
      toast.error(error.message || 'Failed to remove player from squad');
    }
  };

  const handleAvailabilityChange = async (playerId: string, status: string) => {
    try {
      console.log('Updating availability:', { playerId, status });
      setSquadPlayers(prev => 
        prev.map(player => 
          player.id === playerId 
            ? { ...player, availabilityStatus: status as any }
            : player
        )
      );
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

  const getAvailabilityColorForEvent = (status?: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'unavailable': return 'text-red-600';
      case 'pending': return 'text-amber-600';
      default: return 'text-gray-500';
    }
  };

  if (playersLoading) {
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
              Squad Management (Team {currentTeamIndex + 1})
              <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{squadPlayers.length} players</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isMobile ? 'px-3 pb-3' : 'space-y-4'}`}>
            {/* Sort and Filter Controls */}
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
                <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'w-48'}`}>
                  <Filter className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="in_squad">In Squad</SelectItem>
                  <SelectItem value="not_in_squad">Available to Add</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Players List */}
            <div className={`space-y-2 ${isMobile ? 'space-y-1' : ''}`}>
              {filteredPlayers.length === 0 ? (
                <div className={`text-center text-muted-foreground ${isMobile ? 'py-4 text-sm' : 'py-8'}`}>
                  {allPlayers.length === 0 
                    ? 'No players found in this team'
                    : 'No players match the current filter.'
                  }
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div key={player.id} className={`flex items-center justify-between border rounded-lg ${isMobile ? 'p-2' : 'p-3'} ${player.isAssignedElsewhere ? 'bg-gray-50 opacity-75' : ''}`}>
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
                                <p>Assigned to another team</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
                      {player.isInCurrentSquad ? (
                        <>
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
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddPlayer(player.id)}
                          disabled={player.isAssignedElsewhere}
                          className={isMobile ? 'h-7 px-2' : ''}
                        >
                          <UserPlus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                          {isMobile ? 'Add' : 'Add to Squad'}
                        </Button>
                      )}
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
