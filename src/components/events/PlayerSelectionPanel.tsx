import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Crown, UserCheck, Filter, Grid3X3, AlertTriangle } from 'lucide-react';
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
  captainId?: string;
  onPlayersChange: (players: string[]) => void;
  onCaptainChange: (captainId: string) => void;
  eventType?: string;
  showFormationView?: boolean;
  formation?: string;
  onFormationChange?: (formation: string) => void;
  gameFormat?: GameFormat;
  eventId?: string;
  teamNumber?: number;
  periodNumber?: number;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  teamId,
  selectedPlayers,
  captainId,
  onPlayersChange,
  onCaptainChange,
  eventType = 'match',
  showFormationView = false,
  formation,
  onFormationChange,
  gameFormat = '7-a-side',
  eventId,
  teamNumber,
  periodNumber
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
  }, [selectedPlayers, eventId, teamNumber, periodNumber]);

  const checkPlayerConflicts = async () => {
    if (!eventId || teamNumber === undefined || periodNumber === undefined) return;
    
    try {
      const { data: otherSelections, error } = await supabase
        .from('event_selections')
        .select('team_number, period_number, player_positions')
        .eq('event_id', eventId)
        .eq('team_id', teamId)
        .neq('team_number', teamNumber);

      if (error) throw error;

      const conflicts: { [playerId: string]: string[] } = {};
      
      selectedPlayers.forEach(playerId => {
        const conflictTeams: string[] = [];
        
        otherSelections?.forEach(selection => {
          const playerPositions = selection.player_positions as any[] || [];
          const hasPlayer = playerPositions.some(pp => pp.playerId === playerId || pp.player_id === playerId);
          
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
      <div className="space-y-4">
        <FormationSelector
          gameFormat={gameFormat}
          selectedFormation={formation}
          onFormationChange={onFormationChange}
        />
        
        <div className="space-y-3">
          <Label className="text-sm font-medium">Starting XI ({positions.length} positions)</Label>
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
                    {filteredPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.squad_number} {player.name}
                        {player.subscription_type !== 'full_squad' && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({getSubscriptionLabel(player.subscription_type)})
                          </span>
                        )}
                      </SelectItem>
                    ))}
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
        </div>
      </div>
    );
  };

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

  const hasConflicts = Object.keys(playerConflicts).length > 0;

  return (
    <Card>
      <CardHeader>
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
      <CardContent className="space-y-4">
        {hasConflicts && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some players are selected for multiple teams:
              <ul className="mt-2 space-y-1">
                {Object.entries(playerConflicts).map(([playerId, conflicts]) => {
                  const player = players.find(p => p.id === playerId);
                  return (
                    <li key={playerId} className="text-sm">
                      <strong>{player?.name}</strong> is also in: {conflicts.join(', ')}
                    </li>
                  );
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}

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
              <>
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {selectedPlayers.length} of {filteredPlayers.length} selected
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPlayers.map((player) => {
                    const hasConflict = playerConflicts[player.id];
                    return (
                      <div key={player.id} className={`flex items-center space-x-3 p-3 border rounded ${hasConflict ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <Checkbox
                          id={`player-${player.id}`}
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`player-${player.id}`} className="font-medium cursor-pointer">
                              #{player.squad_number} {player.name}
                            </Label>
                            <Badge className={`text-white text-xs ${getSubscriptionBadgeColor(player.subscription_type)}`}>
                              {getSubscriptionLabel(player.subscription_type)}
                            </Badge>
                            {hasConflict && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Conflict
                              </Badge>
                            )}
                          </div>
                          {hasConflict && (
                            <p className="text-xs text-orange-600 mt-1">
                              Also selected in: {hasConflict.join(', ')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={captainId === player.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleCaptainSelect(player.id)}
                          className="flex items-center gap-1"
                        >
                          <Crown className="h-3 w-3" />
                          {captainId === player.id ? 'Captain' : 'Make Captain'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
