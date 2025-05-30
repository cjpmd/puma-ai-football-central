import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Crown, UserCheck, Filter, Grid3X3, AlertTriangle, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FormationSelector } from './FormationSelector';
import { getPositionsForFormation } from '@/utils/formationUtils';
import { GameFormat } from '@/types';

interface Player {
  id: string;
  name: string;
  squad_number: number;
  subscription_type: string;
  subscription_status: string;
  status: string;
}

interface PlayerSelectionPanelProps {
  teamId: string;
  selectedPlayers: string[];
  substitutePlayers?: string[];
  captainId?: string;
  onPlayersChange: (players: string[]) => void;
  onSubstitutesChange?: (substitutes: string[]) => void;
  onCaptainChange: (captainId: string) => void;
  eventType?: string;
  showFormationView?: boolean;
  formation?: string;
  onFormationChange?: (formation: string) => void;
  gameFormat?: GameFormat;
  eventId?: string;
  teamNumber?: number;
  periodNumber?: number;
  showSubstitutesInFormation?: boolean;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  teamId,
  selectedPlayers,
  substitutePlayers = [],
  captainId,
  onPlayersChange,
  onSubstitutesChange,
  onCaptainChange,
  eventType = 'match',
  showFormationView = false,
  formation,
  onFormationChange,
  gameFormat = '7-a-side',
  eventId,
  teamNumber,
  periodNumber,
  showSubstitutesInFormation = false
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullSquadOnly, setShowFullSquadOnly] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'formation'>('list');
  const [positionPlayers, setPositionPlayers] = useState<{ [position: string]: string }>({});
  const [playerConflicts, setPlayerConflicts] = useState<{ [playerId: string]: string[] }>({});

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  useEffect(() => {
    filterPlayers();
  }, [players, showFullSquadOnly, eventType]);

  useEffect(() => {
    if (eventId && teamNumber !== undefined && periodNumber !== undefined) {
      checkPlayerConflicts();
    }
  }, [selectedPlayers, substitutePlayers, eventId, teamNumber, periodNumber]);

  // Sync positionPlayers with selectedPlayers when switching to formation view
  useEffect(() => {
    if (viewMode === 'formation' && formation) {
      const positions = getPositionsForFormation(formation, gameFormat);
      const newPositionPlayers: { [position: string]: string } = {};
      
      // Map selected players to positions (first come, first served)
      selectedPlayers.forEach((playerId, index) => {
        if (index < positions.length) {
          newPositionPlayers[positions[index]] = playerId;
        }
      });
      
      setPositionPlayers(newPositionPlayers);
    }
  }, [viewMode, formation, selectedPlayers, gameFormat]);

  const checkPlayerConflicts = async () => {
    if (!eventId || teamNumber === undefined || periodNumber === undefined) return;
    
    try {
      const { data: otherSelections, error } = await supabase
        .from('event_selections')
        .select('team_number, period_number, player_positions, substitute_players')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .neq('team_number', teamNumber);

      if (error) {
        console.error('Error checking conflicts:', error);
        return;
      }

      const conflicts: { [playerId: string]: string[] } = {};
      
      const allSelectedPlayers = [...selectedPlayers, ...substitutePlayers];
      
      allSelectedPlayers.forEach(playerId => {
        const conflictTeams: string[] = [];
        
        otherSelections?.forEach(selection => {
          const playerPositions = (selection.player_positions as any[]) || [];
          const substitutePlayersList = (selection.substitute_players as string[]) || [];
          
          const hasPlayer = playerPositions.some((pp: any) => pp.playerId === playerId || pp.player_id === playerId) ||
                           substitutePlayersList.includes(playerId);
          
          if (hasPlayer) {
            conflictTeams.push(`Team ${selection.team_number} Period ${selection.period_number}`);
          }
        });
        
        if (conflictTeams.length > 0) {
          conflicts[playerId] = conflictTeams;
        }
      });
      
      setPlayerConflicts(conflicts);
    } catch (error) {
      console.error('Error checking player conflicts:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number, subscription_type, subscription_status, status')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number', { ascending: true });

      if (error) throw error;

      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = players;

    if (showFullSquadOnly) {
      if (eventType === 'match' || eventType === 'fixture') {
        filtered = players.filter(player => 
          player.subscription_type === 'full_squad' && 
          player.subscription_status === 'active'
        );
      }
    }

    setFilteredPlayers(filtered);
  };

  const handlePlayerToggle = (playerId: string) => {
    const newSelectedPlayers = selectedPlayers.includes(playerId)
      ? selectedPlayers.filter(id => id !== playerId)
      : [...selectedPlayers, playerId];
    onPlayersChange(newSelectedPlayers);
  };

  const handleSubstituteToggle = (playerId: string) => {
    if (!onSubstitutesChange) return;
    
    const newSubstitutes = substitutePlayers.includes(playerId)
      ? substitutePlayers.filter(id => id !== playerId)
      : [...substitutePlayers, playerId];
    onSubstitutesChange(newSubstitutes);
  };

  const handleCaptainSelect = (playerId: string) => {
    if (captainId === playerId) {
      onCaptainChange('');
    } else {
      onCaptainChange(playerId);
      if (!selectedPlayers.includes(playerId)) {
        onPlayersChange([...selectedPlayers, playerId]);
      }
    }
  };

  const handlePositionPlayerChange = (position: string, playerId: string) => {
    const newPositionPlayers = { ...positionPlayers };
    
    if (playerId === 'none') {
      delete newPositionPlayers[position];
    } else {
      newPositionPlayers[position] = playerId;
    }
    
    setPositionPlayers(newPositionPlayers);
    
    // Update selected players based on position assignments
    const positionPlayerIds = Object.values(newPositionPlayers).filter(id => id !== '');
    onPlayersChange(positionPlayerIds);
  };

  const handleSelectAll = () => {
    const allPlayerIds = filteredPlayers.map(p => p.id);
    onPlayersChange(allPlayerIds);
  };

  const handleDeselectAll = () => {
    onPlayersChange([]);
    onCaptainChange('');
    setPositionPlayers({});
    if (onSubstitutesChange) {
      onSubstitutesChange([]);
    }
  };

  const getSubscriptionBadgeColor = (subscriptionType: string) => {
    switch (subscriptionType) {
      case 'full_squad': return 'bg-green-500';
      case 'limited': return 'bg-yellow-500';
      case 'free': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionLabel = (subscriptionType: string) => {
    switch (subscriptionType) {
      case 'full_squad': return 'Full Squad';
      case 'limited': return 'Limited';
      case 'free': return 'Free';
      default: return 'Unknown';
    }
  };

  const handleFullSquadFilterChange = (checked: boolean | "indeterminate") => {
    setShowFullSquadOnly(checked === true);
  };

  const renderFormationView = () => {
    if (!formation || !onFormationChange) return null;
    
    const positions = getPositionsForFormation(formation, gameFormat);
    
    return (
      <ScrollArea className="h-full">
        <div className="space-y-4 p-1">
          <FormationSelector
            gameFormat={gameFormat}
            selectedFormation={formation}
            onFormationChange={onFormationChange}
          />
          
          <div className="space-y-3">
            <Label className="text-sm font-medium">Starting Team ({positions.length} positions)</Label>
            <p className="text-xs text-muted-foreground">
              Assign players to specific positions for the {formation} formation
            </p>
            
            <div className="grid gap-3">
              {positions.map((position) => (
                <div key={position} className="flex items-center gap-3">
                  <div className="w-12 text-sm font-medium">{position}</div>
                  <Select
                    value={positionPlayers[position] || 'none'}
                    onValueChange={(value) => handlePositionPlayerChange(position, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="No Player" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Player</SelectItem>
                      {filteredPlayers.map((player) => {
                        const hasConflict = playerConflicts[player.id];
                        return (
                          <SelectItem key={player.id} value={player.id}>
                            <div className="flex items-center gap-2">
                              #{player.squad_number} {player.name}
                              {player.subscription_type !== 'full_squad' && (
                                <span className="text-xs text-muted-foreground">
                                  ({getSubscriptionLabel(player.subscription_type)})
                                </span>
                              )}
                              {hasConflict && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                                  <span className="text-xs text-orange-600">
                                    Conflict: {hasConflict.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {captainId === positionPlayers[position] && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2">
              <Label>Captain</Label>
              <Select value={captainId || 'none'} onValueChange={(value) => onCaptainChange(value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="No Captain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Captain</SelectItem>
                  {Object.values(positionPlayers).filter(id => id !== '').map((playerId) => {
                    const player = filteredPlayers.find(p => p.id === playerId);
                    return player ? (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.squad_number} {player.name}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Show substitutes in formation view */}
            {showSubstitutesInFormation && onSubstitutesChange && (
              <div className="mt-6 space-y-3">
                <Label className="text-sm font-medium">Substitutes</Label>
                <div className="space-y-2">
                  {substitutePlayers.map((playerId) => {
                    const player = filteredPlayers.find(p => p.id === playerId);
                    const hasConflict = playerConflicts[playerId];
                    return player ? (
                      <div key={playerId} className={`flex items-center gap-2 p-2 border rounded ${hasConflict ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <span className="text-sm">#{player.squad_number} {player.name}</span>
                        <Badge className={`text-white text-xs ${getSubscriptionBadgeColor(player.subscription_type)}`}>
                          {getSubscriptionLabel(player.subscription_type)}
                        </Badge>
                        {hasConflict && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600">
                              Conflict: {hasConflict.join(', ')}
                            </span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSubstitutes = substitutePlayers.filter(id => id !== playerId);
                            onSubstitutesChange(newSubstitutes);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null;
                  })}
                  
                  {/* Add substitute selector */}
                  <Select onValueChange={(playerId) => {
                    if (playerId && !substitutePlayers.includes(playerId)) {
                      onSubstitutesChange([...substitutePlayers, playerId]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add substitute" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPlayers
                        .filter(player => !selectedPlayers.includes(player.id) && !substitutePlayers.includes(player.id))
                        .map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            #{player.squad_number} {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderPlayerList = (playerList: string[], onToggle: (playerId: string) => void, title: string, icon: React.ReactNode) => (
    <ScrollArea className="h-96">
      <div className="space-y-2 p-1">
        {filteredPlayers.map((player) => {
          const isSelected = playerList.includes(player.id);
          const hasConflict = playerConflicts[player.id];
          return (
            <div key={player.id} className={`flex items-center space-x-3 p-3 border rounded ${hasConflict ? 'border-orange-200 bg-orange-50' : ''}`}>
              <Checkbox
                id={`${title}-${player.id}`}
                checked={isSelected}
                onCheckedChange={() => onToggle(player.id)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor={`${title}-${player.id}`} className="font-medium cursor-pointer">
                    #{player.squad_number} {player.name}
                  </Label>
                  <Badge className={`text-white text-xs ${getSubscriptionBadgeColor(player.subscription_type)}`}>
                    {getSubscriptionLabel(player.subscription_type)}
                  </Badge>
                  {hasConflict && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600">
                        Conflict: {hasConflict.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {title === 'starter' && (
                <Button
                  variant={captainId === player.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCaptainSelect(player.id)}
                  className="flex items-center gap-1"
                >
                  <Crown className="h-3 w-3" />
                  {captainId === player.id ? 'Captain' : 'Make Captain'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading players...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Player Selection
        </CardTitle>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fullSquadFilter"
              checked={showFullSquadOnly}
              onCheckedChange={handleFullSquadFilterChange}
            />
            <Label htmlFor="fullSquadFilter" className="text-sm">
              Show Full Squad subscribers only
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullSquadOnly(!showFullSquadOnly)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFullSquadOnly ? 'Show All Players' : 'Filter Full Squad'}
          </Button>
          {showFormationView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'formation' : 'list')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              {viewMode === 'list' ? 'Formation View' : 'List View'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {showFullSquadOnly 
              ? 'No Full Squad subscribers found.' 
              : 'No players found for this team.'
            }
          </div>
        ) : (
          <>
            {viewMode === 'formation' && showFormationView ? (
              renderFormationView()
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex gap-2 mb-4 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {selectedPlayers.length} starters, {substitutePlayers.length} substitutes
                  </div>
                </div>

                {onSubstitutesChange ? (
                  <Tabs defaultValue="starters" className="flex-1 min-h-0 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                      <TabsTrigger value="starters" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Starters ({selectedPlayers.length})
                      </TabsTrigger>
                      <TabsTrigger value="substitutes" className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Substitutes ({substitutePlayers.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="starters" className="flex-1 min-h-0 mt-2">
                      {renderPlayerList(selectedPlayers, handlePlayerToggle, 'starter', <Users className="h-4 w-4" />)}
                    </TabsContent>
                    
                    <TabsContent value="substitutes" className="flex-1 min-h-0 mt-2">
                      {renderPlayerList(substitutePlayers, handleSubstituteToggle, 'substitute', <UserMinus className="h-4 w-4" />)}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex-1 min-h-0">
                    {renderPlayerList(selectedPlayers, handlePlayerToggle, 'starter', <Users className="h-4 w-4" />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
