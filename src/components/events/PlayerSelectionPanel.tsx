
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Users, Crown, UserCheck, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  teamId,
  selectedPlayers,
  captainId,
  onPlayersChange,
  onCaptainChange,
  eventType = 'match'
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullSquadOnly, setShowFullSquadOnly] = useState(true);

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  useEffect(() => {
    filterPlayers();
  }, [players, showFullSquadOnly, eventType]);

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
      // For matches/fixtures, default to Full Squad subscription only
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

  const handleSelectAll = () => {
    const allPlayerIds = filteredPlayers.map(p => p.id);
    onPlayersChange(allPlayerIds);
  };

  const handleDeselectAll = () => {
    onPlayersChange([]);
    onCaptainChange('');
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
              onCheckedChange={setShowFullSquadOnly}
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            {showFullSquadOnly 
              ? 'No Full Squad subscribers found.' 
              : 'No players found for this team.'
            }
          </div>
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
              {filteredPlayers.map((player) => (
                <div key={player.id} className="flex items-center space-x-3 p-3 border rounded">
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
                    </div>
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
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
