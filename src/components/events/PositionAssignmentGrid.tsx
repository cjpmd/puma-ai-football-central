
import React from 'react';
import { PositionSlot, SquadPlayer } from '@/types/teamSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PositionAssignmentGridProps {
  positions: PositionSlot[];
  positionAssignments: { [positionId: string]: string };
  onPositionAssign: (positionId: string, playerId: string) => void;
  squadPlayers: SquadPlayer[];
  formation: string;
  onFormationChange: (formation: string) => void;
}

export const PositionAssignmentGrid: React.FC<PositionAssignmentGridProps> = ({
  positions,
  positionAssignments,
  onPositionAssign,
  squadPlayers,
  formation,
  onFormationChange
}) => {
  const handlePlayerDrop = (positionId: string, playerId: string) => {
    onPositionAssign(positionId, playerId);
  };

  const getPlayerAtPosition = (positionId: string) => {
    const playerId = positionAssignments[positionId];
    return playerId ? squadPlayers.find(p => p.id === playerId) : undefined;
  };

  const formations = ['1-2-3-1', '1-3-2-1', '2-2-2-1', '3-2-1'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formation & Selection</CardTitle>
        <div className="flex items-center gap-4">
          {formations.map((form) => (
            <Button
              key={form}
              variant={formation === form ? "default" : "outline"}
              size="sm"
              onClick={() => onFormationChange(form)}
            >
              {form}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-green-500 rounded-lg p-8 min-h-[400px]">
          {/* Football pitch background */}
          <div className="absolute inset-4 border-2 border-white rounded">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            
            {/* Goal areas */}
            <div className="absolute top-0 left-1/2 w-20 h-12 border-2 border-white border-t-0 transform -translate-x-1/2"></div>
            <div className="absolute bottom-0 left-1/2 w-20 h-12 border-2 border-white border-b-0 transform -translate-x-1/2"></div>
          </div>

          {/* Player positions */}
          {positions.map((position) => {
            const player = getPlayerAtPosition(position.id);
            return (
              <div
                key={position.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full border-2 border-white flex items-center justify-center
                    ${player ? 'bg-blue-600 text-white' : 'bg-white/20 border-dashed'}
                  `}>
                    {player ? (
                      <span className="text-xs font-bold">#{player.squadNumber}</span>
                    ) : (
                      <span className="text-xs text-white">{position.abbreviation}</span>
                    )}
                  </div>
                  {player && (
                    <div className="mt-1 px-2 py-0.5 bg-white/90 rounded text-xs font-medium">
                      {player.name}
                    </div>
                  )}
                  {!player && (
                    <div className="mt-1 px-2 py-0.5 bg-white/40 rounded text-xs">
                      {position.positionName}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Available players */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Available Players</h4>
          <div className="grid grid-cols-4 gap-2">
            {squadPlayers
              .filter(player => !Object.values(positionAssignments).includes(player.id))
              .map((player) => (
                <div
                  key={player.id}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-50 text-center"
                  onClick={() => {
                    // Find first empty position
                    const emptyPosition = positions.find(pos => !positionAssignments[pos.id]);
                    if (emptyPosition) {
                      handlePlayerDrop(emptyPosition.id, player.id);
                    }
                  }}
                >
                  <Badge variant="outline" className="mb-1">#{player.squadNumber}</Badge>
                  <div className="text-sm font-medium">{player.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {player.availabilityStatus}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
