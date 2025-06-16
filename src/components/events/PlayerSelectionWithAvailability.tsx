import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Star, Clock, AlertCircle, Grid, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GameFormat } from '@/types';
import { getFormationsByFormat, getPositionsForFormation } from '@/utils/formationUtils';
import { formatPlayerName } from '@/utils/nameUtils';
import { NameDisplayOption } from '@/types/team';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  availability?: 'available' | 'unavailable' | 'pending' | null;
}

interface PlayerSelectionProps {
  teamId: string;
  eventId: string;
  selectedPlayers: string[];
  substitutePlayers: string[];
  captainId: string;
  onPlayersChange: (players: string[]) => void;
  onSubstitutesChange: (substitutes: string[]) => void;
  onCaptainChange: (captainId: string) => void;
  eventType: string;
  formation: string;
  onFormationChange: (formation: string) => void;
  gameFormat: GameFormat;
  teamNumber: number;
  periodNumber: number;
  getPlayerTimeInfo?: (playerId: string) => string;
}

export const PlayerSelectionWithAvailability: React.FC<PlayerSelectionProps> = ({
  teamId,
  eventId,
  selectedPlayers,
  substitutePlayers,
  captainId,
  onPlayersChange,
  onSubstitutesChange,
  onCaptainChange,
  eventType,
  formation,
  onFormationChange,
  gameFormat,
  teamNumber,
  periodNumber,
  getPlayerTimeInfo = () => ''
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [nameDisplayOption, setNameDisplayOption] = useState<NameDisplayOption>('surname');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'formation'>('list');

  useEffect(() => {
    loadPlayersAndAvailability();
    loadTeamNameDisplaySetting();
  }, [teamId, eventId]);

  const loadTeamNameDisplaySetting = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('name_display_option')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      setNameDisplayOption((data?.name_display_option as NameDisplayOption) || 'surname');
    } catch (error) {
      console.error('Error loading team name display setting:', error);
    }
  };

  const loadPlayersAndAvailability = async () => {
    try {
      setLoading(true);
      
      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, squad_number')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (playersError) throw playersError;

      // Load availability
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('event_availability')
        .select('user_id, status, role')
        .eq('event_id', eventId);

      if (availabilityError) throw availabilityError;

      // Load user-player relationships
      const { data: userPlayersData, error: userPlayersError } = await supabase
        .from('user_players')
        .select('user_id, player_id, relationship');

      if (userPlayersError) throw userPlayersError;

      // Create availability mapping
      const availabilityMap: Record<string, any> = {};
      
      if (availabilityData && userPlayersData) {
        userPlayersData.forEach(userPlayer => {
          const playerAvailability = availabilityData.find(avail => 
            avail.user_id === userPlayer.user_id && 
            (avail.role === 'player' || avail.role === 'parent')
          );
          
          if (playerAvailability) {
            availabilityMap[userPlayer.player_id] = {
              status: playerAvailability.status,
              role: playerAvailability.role
            };
          }
        });
      }

      setPlayers(playersData || []);
      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error loading players and availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPlayerDisplayName = (player: Player): string => {
    const formattedName = formatPlayerName(player.name, nameDisplayOption);
    const timeInfo = getPlayerTimeInfo(player.id);
    return `${formattedName} (#${player.squad_number})${timeInfo}`;
  };

  const getAvailabilityIcon = (playerId: string) => {
    const avail = availability[playerId];
    if (!avail) return null;
    
    switch (avail.status) {
      case 'available':
        return <span className="text-green-500">✓</span>;
      case 'unavailable':
        return <span className="text-red-500">✗</span>;
      case 'pending':
        return <Clock className="h-3 w-3 text-amber-500" />;
      default:
        return null;
    }
  };

  const getAvailabilityBadge = (playerId: string) => {
    const avail = availability[playerId];
    if (!avail) return null;
    
    switch (avail.status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
      case 'unavailable':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Unavailable</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      default:
        return null;
    }
  };

  const isPlayerConflicted = (playerId: string): boolean => {
    // Check if player is already selected in another team for this period
    // This would need to be passed down from parent or calculated differently
    // For now, return false as we don't have access to other teams' data
    return false;
  };

  const handlePlayerToggle = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      // Remove from selected players
      const newSelected = selectedPlayers.filter(id => id !== playerId);
      onPlayersChange(newSelected);
      
      // Also remove as captain if they were captain
      if (captainId === playerId) {
        onCaptainChange('no-captain');
      }
    } else {
      // Add to selected players
      const positions = getPositionsForFormation(formation, gameFormat);
      if (selectedPlayers.length < positions.length) {
        onPlayersChange([...selectedPlayers, playerId]);
      }
    }
  };

  const handleSubstituteToggle = (playerId: string) => {
    if (substitutePlayers.includes(playerId)) {
      // Remove from substitutes
      const newSubstitutes = substitutePlayers.filter(id => id !== playerId);
      onSubstitutesChange(newSubstitutes);
      
      // Also remove as captain if they were captain
      if (captainId === playerId) {
        onCaptainChange('no-captain');
      }
    } else {
      // Add to substitutes
      onSubstitutesChange([...substitutePlayers, playerId]);
    }
  };

  const handlePositionPlayerChange = (positionIndex: number, playerId: string) => {
    const newSelectedPlayers = [...selectedPlayers];
    
    if (playerId === 'none') {
      // Remove player from this position
      newSelectedPlayers.splice(positionIndex, 1);
    } else {
      // Remove player from their current position if they're already selected
      const currentIndex = newSelectedPlayers.indexOf(playerId);
      if (currentIndex !== -1) {
        newSelectedPlayers.splice(currentIndex, 1);
      }
      
      // Add player to the new position
      if (positionIndex < newSelectedPlayers.length) {
        newSelectedPlayers[positionIndex] = playerId;
      } else {
        // Fill gaps with empty strings if needed
        while (newSelectedPlayers.length < positionIndex) {
          newSelectedPlayers.push('');
        }
        newSelectedPlayers.push(playerId);
      }
    }
    
    // Filter out empty strings
    const filteredPlayers = newSelectedPlayers.filter(id => id !== '');
    onPlayersChange(filteredPlayers);
  };

  const availablePlayers = players.filter(player => 
    !selectedPlayers.includes(player.id) && !substitutePlayers.includes(player.id)
  );

  const formations = getFormationsByFormat(gameFormat);
  const positions = getPositionsForFormation(formation, gameFormat);
  const maxPlayers = positions.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading players...</div>
        </CardContent>
      </Card>
    );
  }

  const renderFormationView = () => {
    return (
      <div className="space-y-6">
        {/* Formation Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formation & Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Formation:</Label>
                <Select value={formation} onValueChange={onFormationChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formations
                      .filter(form => form.id && form.id.trim() !== '') // Filter out formations with empty IDs
                      .map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Captain:</Label>
                <Select 
                  value={captainId || 'no-captain'} 
                  onValueChange={(value) => onCaptainChange(value === 'no-captain' ? '' : value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select captain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-captain">No Captain</SelectItem>
                    {[...selectedPlayers, ...substitutePlayers]
                      .map(playerId => players.find(p => p.id === playerId))
                      .filter(Boolean)
                      .map((player) => (
                        <SelectItem key={player!.id} value={player!.id}>
                          {formatPlayerDisplayName(player!)}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Formation requires {maxPlayers} players • Team {teamNumber} • Period {periodNumber}
            </div>
          </CardContent>
        </Card>

        {/* Formation Pitch with Position Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formation - {formation}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-100 p-6 rounded-lg border-2 border-green-300 min-h-[400px]">
              <div className="text-center text-sm font-medium text-green-800 mb-4">
                Assign players to positions
              </div>
              
              <div className="space-y-4">
                {positions.map((position, index) => {
                  const assignedPlayerId = selectedPlayers[index];
                  const assignedPlayer = assignedPlayerId ? players.find(p => p.id === assignedPlayerId) : null;
                  const availableForPosition = players.filter(p => 
                    !selectedPlayers.includes(p.id) || p.id === assignedPlayerId
                  );

                  return (
                    <div key={`${position}-${index}`} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="min-w-[60px] text-center font-medium">
                          {position}
                        </Badge>
                        <div className="flex-1">
                          <Select
                            value={assignedPlayerId || 'none'}
                            onValueChange={(value) => handlePositionPlayerChange(index, value)}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select player" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Player</SelectItem>
                              {availableForPosition.map((player) => {
                                const isConflicted = isPlayerConflicted(player.id);
                                const timeInfo = getPlayerTimeInfo(player.id);
                                
                                return (
                                  <SelectItem key={player.id} value={player.id}>
                                    <div className="flex items-center gap-2 w-full">
                                      <span>{formatPlayerDisplayName(player)}</span>
                                      {getAvailabilityIcon(player.id)}
                                      {isConflicted && <AlertCircle className="h-3 w-3 text-red-500" />}
                                      {timeInfo && (
                                        <Badge variant="outline" className="text-xs">
                                          {timeInfo}
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
                      
                      {assignedPlayer && (
                        <div className="flex items-center gap-2">
                          {captainId === assignedPlayer.id && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          {getAvailabilityBadge(assignedPlayer.id)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Substitute Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Substitute Players ({substitutePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {substitutePlayers.map((playerId) => {
                  const player = players.find(p => p.id === playerId);
                  if (!player) return null;
                  
                  const isCaptain = captainId === playerId;
                  const isConflicted = isPlayerConflicted(playerId);
                  
                  return (
                    <div
                      key={playerId}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCaptain ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                      } ${isConflicted ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="min-w-[60px] text-center">
                          SUB
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatPlayerDisplayName(player)}</span>
                            {isCaptain && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                            {getAvailabilityIcon(playerId)}
                            {isConflicted && <AlertCircle className="h-4 w-4 text-red-500" />}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {getAvailabilityBadge(playerId)}
                            {isConflicted && (
                              <Badge variant="destructive" className="text-xs">
                                Also in Team {/* This would show which other team */}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubstituteToggle(playerId)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
                
                {substitutePlayers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No substitute players selected yet
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {/* Add substitute from available players */}
            {availablePlayers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Add Substitute:</Label>
                  <Select onValueChange={(playerId) => {
                    if (playerId !== 'none') {
                      handleSubstituteToggle(playerId);
                    }
                  }}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select player to add as substitute" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a player</SelectItem>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          <div className="flex items-center gap-2">
                            <span>{formatPlayerDisplayName(player)}</span>
                            {getAvailabilityIcon(player.id)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="space-y-6">
        {/* Formation Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formation & Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ... keep existing code (formation and captain selection) */}
          </CardContent>
        </Card>

        {/* Starting Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Starting Players ({selectedPlayers.length}/{maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ... keep existing code (starting players list) */}
          </CardContent>
        </Card>

        {/* Substitute Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Substitute Players ({substitutePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ... keep existing code (substitute players list) */}
          </CardContent>
        </Card>

        {/* Available Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Players ({availablePlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ... keep existing code (available players list) */}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            List View
          </Button>
          <Button
            variant={viewMode === 'formation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('formation')}
            className="flex items-center gap-2"
          >
            <Grid className="h-4 w-4" />
            Formation View
          </Button>
        </div>
      </div>

      {viewMode === 'formation' ? renderFormationView() : renderListView()}
    </div>
  );
};
