import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFormationsByFormat, getPositionsForFormation } from '@/utils/formationUtils';
import { Plus, Users } from 'lucide-react';
import { FormationSelector } from './FormationSelector';
import { Position, GameFormat } from '@/types';

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
  position: Position;
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

  // Cast gameFormat to GameFormat type for utility functions
  const gameFormatTyped = gameFormat as GameFormat;
  const formations = getFormationsByFormat(gameFormatTyped);

  useEffect(() => {
    loadPlayers();
    // Set default formation if available
    if (formations.length > 0 && !selectedFormation) {
      setSelectedFormation(formations[0].id);
    }
  }, [teamId, gameFormat]);

  useEffect(() => {
    // Update positions when formation changes
    if (selectedFormation) {
      const formationPositions = getPositionsForFormation(selectedFormation, gameFormatTyped);
      const newPositions: PositionAssignment[] = formationPositions.map(position => {
        // Try to keep existing player assignments when switching formations
        const existingAssignment = positions.find(p => p.position === position);
        return {
          position,
          playerId: existingAssignment?.playerId || null
        };
      });
      setPositions(newPositions);
    }
  }, [selectedFormation, gameFormat]);

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

  const handlePositionChange = (position: Position, playerId: string | null) => {
    setPositions(prev => 
      prev.map(p => 
        p.position === position 
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
      {/* Formation Selection with Mini Pitches */}
      <Card>
        <CardHeader>
          <CardTitle>Formation & Captain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormationSelector
            gameFormat={gameFormatTyped}
            selectedFormation={selectedFormation}
            onFormationChange={setSelectedFormation}
          />
          
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
        </CardContent>
      </Card>

      {/* Starting Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Starting Positions ({selectedFormation || 'No formation selected'})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((positionAssignment, index) => (
              <div key={`${positionAssignment.position}-${index}`} className="space-y-2">
                <label className="text-sm font-medium">{positionAssignment.position}</label>
                <Select 
                  value={positionAssignment.playerId || ''} 
                  onValueChange={(value) => handlePositionChange(positionAssignment.position, value || null)}
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
                        className={isPlayerSelected(player.id) && positionAssignment.playerId !== player.id ? 'opacity-50' : ''}
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

      {/* Formation View */}
      <Card>
        <CardHeader>
          <CardTitle>Formation View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-100 aspect-[3/2] rounded-lg p-4 text-center relative border-2 border-green-300">
            <p className="text-muted-foreground">Formation: {selectedFormation || 'None selected'}</p>
            <p className="text-sm mt-2">Players assigned: {positions.filter(p => p.playerId).length}/{positions.length}</p>
            
            {/* Simple position representation */}
            <div className="absolute inset-4 grid grid-cols-3 gap-2">
              {positions.slice(0, Math.min(6, positions.length)).map((position, index) => (
                <div key={`${position.position}-${index}`} className="bg-white rounded p-2 text-xs text-center">
                  <div className="font-medium">{position.position}</div>
                  <div className="text-gray-600">
                    {position.playerId ? getPlayerName(position.playerId) : 'Empty'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
