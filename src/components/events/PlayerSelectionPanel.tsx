
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFormationsByFormat } from '@/utils/formationUtils';
import { Plus, Users } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  squadNumber: number;
  availability: string;
}

interface PlayerSelectionPanelProps {
  eventId: string;
  teamId: string;
  gameFormat: string;
  periodNumber: number;
}

interface PositionAssignment {
  positionId: string;
  playerId: string | null;
}

export const PlayerSelectionPanel: React.FC<PlayerSelectionPanelProps> = ({
  eventId,
  teamId,
  gameFormat,
  periodNumber
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<PositionAssignment[]>([]);
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>('');
  const [selectedFormation, setSelectedFormation] = useState<string>('');
  const { toast } = useToast();

  const formations = getFormationsByFormat(gameFormat);
  const maxPlayers = parseInt(gameFormat.split('-')[0]);

  useEffect(() => {
    loadPlayers();
    initializePositions();
  }, [teamId, gameFormat]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, squad_number, availability')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('squad_number');

      if (error) throw error;

      const transformedPlayers: Player[] = (data || []).map(player => ({
        id: player.id,
        name: player.name,
        squadNumber: player.squad_number,
        availability: player.availability
      }));

      setPlayers(transformedPlayers);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    }
  };

  const initializePositions = () => {
    const newPositions: PositionAssignment[] = [];
    for (let i = 1; i <= maxPlayers; i++) {
      newPositions.push({
        positionId: `position-${i}`,
        playerId: null
      });
    }
    setPositions(newPositions);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability.toLowerCase()) {
      case 'green':
        return 'bg-green-500';
      case 'amber':
        return 'bg-amber-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSelectedPlayerIds = () => {
    return [
      ...positions.map(p => p.playerId).filter(Boolean),
      ...substitutes
    ] as string[];
  };

  const isPlayerSelected = (playerId: string) => {
    return getSelectedPlayerIds().includes(playerId);
  };

  const handlePositionChange = (positionId: string, playerId: string | null) => {
    setPositions(prev => 
      prev.map(p => 
        p.positionId === positionId 
          ? { ...p, playerId } 
          : p
      )
    );
  };

  const handleAddSubstitute = (playerId: string) => {
    if (!substitutes.includes(playerId)) {
      setSubstitutes(prev => [...prev, playerId]);
    }
  };

  const handleRemoveSubstitute = (playerId: string) => {
    setSubstitutes(prev => prev.filter(id => id !== playerId));
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} (#${player.squadNumber})` : '';
  };

  return (
    <div className="space-y-6">
      {/* Formation Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Formation & Captain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formation</label>
              <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select formation" />
                </SelectTrigger>
                <SelectContent>
                  {formations.map(formation => (
                    <SelectItem key={formation.id} value={formation.id}>
                      {formation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Captain</label>
              <Select value={captainId} onValueChange={setCaptainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select captain" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} (#{player.squadNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Starting Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Starting XI Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((position, index) => (
              <div key={position.positionId} className="space-y-2">
                <label className="text-sm font-medium">Position {index + 1}</label>
                <Select 
                  value={position.playerId || ''} 
                  onValueChange={(value) => handlePositionChange(position.positionId, value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No player</SelectItem>
                    {players.map(player => (
                      <SelectItem 
                        key={player.id} 
                        value={player.id}
                        className={isPlayerSelected(player.id) && position.playerId !== player.id ? 'opacity-50' : ''}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(player.availability)}`} />
                          {player.name} (#{player.squadNumber})
                          {captainId === player.id && <Badge variant="secondary">C</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Substitutes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Substitutes</span>
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Plus className="h-4 w-4 mr-2" />
              Add Substitute
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {substitutes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No substitutes selected</p>
          ) : (
            <div className="space-y-2">
              {substitutes.map(playerId => (
                <div key={playerId} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{getPlayerName(playerId)}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveSubstitute(playerId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4">
            <label className="text-sm font-medium">Add Substitute</label>
            <Select onValueChange={handleAddSubstitute}>
              <SelectTrigger>
                <SelectValue placeholder="Select player for substitutes" />
              </SelectTrigger>
              <SelectContent>
                {players
                  .filter(player => !getSelectedPlayerIds().includes(player.id))
                  .map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(player.availability)}`} />
                        {player.name} (#{player.squadNumber})
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Formation View Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Formation View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-100 aspect-[3/2] rounded-lg p-4 text-center relative border-2 border-green-300">
            <p className="text-muted-foreground">Formation visualization will be implemented here</p>
            <p className="text-sm mt-2">Current Formation: {selectedFormation || 'None selected'}</p>
            
            {/* Simple position representation */}
            <div className="absolute inset-4 grid grid-cols-3 gap-2">
              {positions.slice(0, 3).map((position, index) => (
                <div key={position.positionId} className="bg-white rounded p-2 text-xs text-center">
                  {position.playerId ? getPlayerName(position.playerId) : `Pos ${index + 1}`}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
