
import { SquadPlayer } from '@/types/teamSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface SubstituteSelectionListProps {
  squadPlayers: SquadPlayer[];
  substitutes: string[];
  onSubstituteToggle: (playerId: string) => void;
}

export const SubstituteSelectionList: React.FC<SubstituteSelectionListProps> = ({
  squadPlayers,
  substitutes,
  onSubstituteToggle
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Substitute Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {squadPlayers.map((player) => (
            <div key={player.id} className="flex items-center space-x-3">
              <Checkbox
                checked={substitutes.includes(player.id)}
                onCheckedChange={() => onSubstituteToggle(player.id)}
              />
              <div>
                <span className="font-medium">{player.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">#{player.squadNumber}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
