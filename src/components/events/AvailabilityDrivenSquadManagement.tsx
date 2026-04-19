
import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, CheckCircle, Clock, X, AlertTriangle } from 'lucide-react';
import { useAvailabilityBasedSquad } from '@/hooks/useAvailabilityBasedSquad';
import { toast } from 'sonner';
import { formatPlayerName } from '@/utils/nameUtils';
import { SquadPlayer } from '@/types/teamSelection';
import { NameDisplayOption } from '@/types/team';

interface AvailabilityDrivenSquadManagementProps {
  teamId: string;
  eventId: string;
  globalCaptainId?: string;
  onSquadChange?: (squadPlayers: SquadPlayer[]) => void;
  onCaptainChange?: (captainId: string) => void;
  allTeamSelections?: any[];
  currentTeamIndex?: number;
  initialSquadPlayers?: SquadPlayer[];
  eventType?: string;
  nameDisplayOption?: NameDisplayOption;
}

export const AvailabilityDrivenSquadManagement: React.FC<AvailabilityDrivenSquadManagementProps> = ({
  teamId,
  eventId,
  globalCaptainId,
  onSquadChange,
  onCaptainChange,
  allTeamSelections = [],
  currentTeamIndex = 0,
  eventType,
  nameDisplayOption = 'fullName',
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

  logger.log('AvailabilityDrivenSquadManagement render:', {
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
        squadRole: (player.squadRole || 'player') as 'player' | 'captain' | 'vice_captain',
        photo_url: player.photo_url
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
      logger.log('Notifying parent of squad change:', squadPlayersFormatted);
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
      logger.log('Adding player to squad:', player.id);
      await assignPlayerToSquad(player.id, 'player');
      toast.success(`${player.name} added to squad`);
    } catch (error: any) {
      logger.error('Error adding player to squad:', error);
      toast.error(`Failed to add ${player.name}: ${error.message}`);
    }
  }, [assignPlayerToSquad]);

  const handleRemoveFromSquad = useCallback(async (playerId: string) => {
    try {
      const playerName = squadPlayers.find(p => p.id === playerId)?.name || 'Player';
      logger.log('Removing player from squad:', playerId);
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
      logger.error('Error removing player from squad:', error);
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
      logger.error('Error updating captain:', error);
      toast.error('Failed to update captain');
    }
  }, [onCaptainChange, squadPlayers]);

  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'unavailable':
        return <X className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-amber-400" />;
    }
  };

  const getAvailabilityRowClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-white/5 border-white/10';
      case 'unavailable':
        return 'bg-white/[0.03] border-white/10 opacity-60';
      default:
        return 'bg-amber-500/[0.08] border-amber-300/20';
    }
  };

  const canAddToSquad = (status: string) => {
    return status === 'available' || status === 'pending';
  };

  const isTrainingEvent = eventType === 'training';

  if (loading) {
    return (
      <div className="ios-card text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/80">Loading squad data...</p>
      </div>
    );
  }

  const availableCount = availablePlayers.filter(p => p.availabilityStatus === 'available').length;
  const pendingCount = availablePlayers.filter(p => p.availabilityStatus === 'pending').length;

  return (
    <div className="space-y-4 overflow-x-hidden text-white">
      {/* Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 ios-card">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge className="text-sm px-2 py-0.5 bg-primary/30 border-primary/40 text-white hover:bg-primary/30">
            {squadPlayers.length}/{availablePlayers.length + squadPlayers.length} selected
          </Badge>
          <span className="text-xs sm:text-sm text-white/70">
            {availableCount} available • {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Selected Squad - Show First */}
      <div className="ios-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 text-white">
          <Users className="h-4 w-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Selected Squad ({squadPlayers.length})</h3>
        </div>
        <div>
          {squadPlayers.length > 0 ? (
            <div className="space-y-3">
              {/* Captain Selection - Hidden for training events */}
              {!isTrainingEvent && (
                <div className="pb-3 border-b border-white/10">
                  <label className="text-xs font-medium mb-2 block text-white/70 uppercase tracking-wider">Captain</label>
                  <Select value={localCaptainId || 'no-captain'} onValueChange={handleCaptainChange}>
                    <SelectTrigger className="w-full max-w-xs bg-white/10 border-white/15 text-white">
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
              )}

              {/* Squad Players List */}
              <div className="space-y-2">
                {squadPlayers
                  .sort((a, b) => {
                    const availabilityOrder = { available: 1, pending: 2, unavailable: 3 };
                    const aOrder = availabilityOrder[a.availabilityStatus as keyof typeof availabilityOrder] || 4;
                    const bOrder = availabilityOrder[b.availabilityStatus as keyof typeof availabilityOrder] || 4;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return a.squadNumber - b.squadNumber;
                  })
                  .map((player) => (
                  <div key={player.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-xl border gap-2 ${getAvailabilityRowClass(player.availabilityStatus)}`}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 bg-white/10 border border-white/15">
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback className="text-[10px] sm:text-xs bg-transparent text-white">{formatPlayerName(player.name, 'initials')}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-xs sm:text-sm truncate text-white">{formatPlayerName(player.name, nameDisplayOption)}</span>
                          <Badge className="text-[10px] px-1 h-4 bg-white/10 border-white/15 text-white/85 hover:bg-white/10">#{player.squadNumber}</Badge>
                          {!isTrainingEvent && player.id === localCaptainId && (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1 h-4 hover:bg-amber-500">
                              <span className="font-bold">C</span>
                            </Badge>
                          )}
                          {isPlayerInOtherTeams(player.id) && (
                            <Badge variant="outline" className="text-blue-300 border-blue-300/40 text-[10px] px-1 h-4">
                              <Users className="h-2.5 w-2.5 sm:mr-0.5" />
                              <span className="hidden sm:inline">Multi</span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/60 mt-0.5">
                          {getAvailabilityIcon(player.availabilityStatus)}
                          <span className="capitalize">{player.availabilityStatus}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromSquad(player.id)}
                      className="text-red-300 hover:text-red-200 hover:bg-red-500/15 shrink-0 h-8 w-8 sm:h-8 sm:w-auto sm:px-3 p-0"
                    >
                      <X className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline text-xs">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-white/60">
              <p className="text-sm">No players selected yet. Add players from the list below.</p>
            </div>
          )}
        </div>
      </div>

      {/* Available Players - Show Second */}
      <div className="ios-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3 text-white">
          <UserPlus className="h-4 w-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider flex-1">Available Players ({availablePlayers.length})</h3>
          {availablePlayers.length === 0 && !loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={reload}
              className="bg-white/5 border-white/15 text-white hover:bg-white/10"
            >
              Reload
            </Button>
          )}
        </div>
        <div>
          {availablePlayers.length > 0 ? (
            <div className="space-y-2">
              {availablePlayers
                .sort((a, b) => {
                  const availabilityOrder = { available: 1, pending: 2, unavailable: 3 };
                  const aOrder = availabilityOrder[a.availabilityStatus as keyof typeof availabilityOrder] || 4;
                  const bOrder = availabilityOrder[b.availabilityStatus as keyof typeof availabilityOrder] || 4;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return a.squadNumber - b.squadNumber;
                })
                .map((player) => (
                <div key={player.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-xl border transition-opacity gap-2 ${getAvailabilityRowClass(player.availabilityStatus)}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 bg-white/10 border border-white/15">
                      <AvatarImage src={`/api/placeholder/40/40`} />
                      <AvatarFallback className="text-[10px] sm:text-xs bg-transparent text-white">{formatPlayerName(player.name, 'initials')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate text-white">{formatPlayerName(player.name, nameDisplayOption)}</span>
                        <Badge className="text-[10px] px-1 h-4 bg-white/10 border-white/15 text-white/85 hover:bg-white/10">#{player.squadNumber}</Badge>
                        {isPlayerInOtherTeams(player.id) && (
                          <Badge variant="outline" className="text-blue-300 border-blue-300/40 text-[10px] px-1 h-4">
                            <Users className="h-2.5 w-2.5 sm:mr-0.5" />
                            <span className="hidden sm:inline">Multi</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/60 mt-0.5">
                        {getAvailabilityIcon(player.availabilityStatus)}
                        <span className="capitalize">{player.availabilityStatus}</span>
                      </div>
                    </div>
                  </div>
                  
                  {canAddToSquad(player.availabilityStatus) ? (
                    <Button
                      size="sm"
                      onClick={() => handleAddToSquad(player)}
                      className={`shrink-0 h-8 w-8 sm:h-8 sm:w-auto sm:px-3 p-0 ${player.availabilityStatus === 'available' 
                        ? "bg-emerald-500/85 hover:bg-emerald-500 text-white"
                        : "bg-amber-500/85 hover:bg-amber-500 text-white"
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline text-xs">Add</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/55 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline capitalize">{player.availabilityStatus}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
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
                  className="mt-4 bg-white/5 border-white/15 text-white hover:bg-white/10"
                >
                  Reload Players
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
