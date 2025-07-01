
import { SquadPlayer } from '@/types/teamSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PlayerSelectionListProps {
  squadPlayers: SquadPlayer[];
  positionAssignments: { [positionId: string]: string };
  onPositionAssign: (positionId: string, playerId: string) => void;
}

export const PlayerSelectionList: React.FC<PlayerSelectionListProps> = ({
  squadPlayers,
  positionAssignments,
  onPositionAssign
}) => {
  const assignedPlayerIds = Object.values(positionAssignments).filter(Boolean);
  const availablePlayers = squadPlayers.filter(player => !assignedPlayerIds.includes(player.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {availablePlayers.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <span className="font-medium">{player.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">#{player.squadNumber}</span>
              </div>
              <Button size="sm" variant="outline">
                Assign Position
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
