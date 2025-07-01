
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
        <div className="space-y-4">
          {positions.map((position) => (
            <div key={position.id} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">
                {position.abbreviation}
              </div>
              <div className="flex-1">
                <Select
                  value={positionAssignments[position.id] || "unassigned"}
                  onValueChange={(value) => onPositionAssign(position.id, value === "unassigned" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {squadPlayers
                      .filter(player => player.id && player.id.trim() !== '') // Filter out players with empty IDs
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (#{player.squadNumber})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
