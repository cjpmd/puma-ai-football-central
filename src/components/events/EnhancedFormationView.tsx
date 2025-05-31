
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star, UserMinus } from 'lucide-react';
import { GameFormat } from '@/types';

interface Player {
  id: string;
  name: string;
  squad_number: number;
}

interface FormationPosition {
  position: string;
  playerId?: string;
  player?: Player;
}

interface EnhancedFormationViewProps {
  formation: string;
  gameFormat: GameFormat;
  selectedPlayers: string[];
  substitutePlayers: string[];
  captainId: string;
  allPlayers: Player[];
  onPositionChange: (position: string, playerId: string | null) => void;
  onCaptainChange: (playerId: string) => void;
  onPlayerRemove: (playerId: string) => void;
}

export const EnhancedFormationView: React.FC<EnhancedFormationViewProps> = ({
  formation,
  gameFormat,
  selectedPlayers,
  substitutePlayers,
  captainId,
  allPlayers,
  onPositionChange,
  onCaptainChange,
  onPlayerRemove
}) => {
  const [formationPositions, setFormationPositions] = useState<FormationPosition[]>([]);

  const getFormationPositions = () => {
    const positions: string[] = [];
    
    switch (formation) {
      case '4-3-3':
        positions.push('GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW');
        break;
      case '4-4-2':
        positions.push('GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST');
        break;
      case '3-5-2':
        positions.push('GK', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'LWB', 'ST', 'ST');
        break;
      case '4-2-3-1':
        positions.push('GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST');
        break;
      case '3-4-3':
        positions.push('GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW');
        break;
      default:
        positions.push('GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW');
    }

    return positions;
  };

  const getPositionedPlayers = () => {
    return allPlayers.filter(player => selectedPlayers.includes(player.id));
  };

  const getBenchPlayers = () => {
    return allPlayers.filter(player => substitutePlayers.includes(player.id));
  };

  const getUnassignedPlayers = () => {
    const positionedPlayerIds = formationPositions
      .filter(pos => pos.playerId)
      .map(pos => pos.playerId);
    
    return allPlayers.filter(player => 
      selectedPlayers.includes(player.id) && 
      !positionedPlayerIds.includes(player.id)
    );
  };

  const positionedPlayers = getPositionedPlayers();
  const benchPlayers = getBenchPlayers();
  const unassignedPlayers = getUnassignedPlayers();

  return (
    <div className="space-y-6">
      {/* Formation Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Formation: {formation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-green-100 rounded-lg p-6 min-h-[300px] relative">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Formation View - {gameFormat}
            </div>
            
            {/* Simple grid layout for positions */}
            <div className="grid grid-cols-3 gap-4 h-full">
              {getFormationPositions().map((position, index) => (
                <div
                  key={`${position}-${index}`}
                  className="bg-white rounded-lg p-2 border-2 border-dashed border-gray-300 min-h-[60px] flex flex-col items-center justify-center text-center"
                >
                  <div className="text-xs font-medium text-gray-600">{position}</div>
                  <div className="text-xs text-gray-500">Drag player here</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Players */}
      {positionedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selected Players ({positionedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positionedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{player.squad_number}</Badge>
                    <span className="font-medium">{player.name}</span>
                    {captainId === player.id && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {captainId !== player.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCaptainChange(player.id)}
                        title="Make Captain"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPlayerRemove(player.id)}
                      title="Remove Player"
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bench Players */}
      {benchPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bench Players ({benchPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {benchPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{player.squad_number}</Badge>
                    <span className="font-medium">{player.name}</span>
                    <Badge variant="secondary" className="text-xs">SUB</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPlayerRemove(player.id)}
                    title="Remove from Bench"
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Players (overflow) */}
      {unassignedPlayers.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Users className="h-5 w-5" />
              Unassigned Players ({unassignedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-orange-600 mb-3">
              These players are selected but not assigned to positions or bench.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{player.squad_number}</Badge>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPlayerRemove(player.id)}
                    title="Remove Player"
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
