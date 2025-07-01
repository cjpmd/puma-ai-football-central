
import { PositionSlot, SquadPlayer } from '@/types/teamSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PositionAssignmentGridProps {
  positions: PositionSlot[];
  positionAssignments: { [positionId: string]: string };
  onPositionAssign: (positionId: string, playerId: string) => void;
  squadPlayers: SquadPlayer[];
}

export const PositionAssignmentGrid: React.FC<PositionAssignmentGridProps> = ({
  positions,
  positionAssignments,
  onPositionAssign,
  squadPlayers
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Position Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {positions.map((position) => (
            <div key={position.id} className="flex items-center justify-between p-2 border rounded">
              <div className="font-medium">{position.positionName}</div>
              <Select
                value={positionAssignments[position.id] || ''}
                onValueChange={(playerId) => onPositionAssign(position.id, playerId)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No player assigned</SelectItem>
                  {squadPlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} ({player.squadNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
