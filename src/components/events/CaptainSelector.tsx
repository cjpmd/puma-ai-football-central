
import { SquadPlayer } from '@/types/teamSelection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CaptainSelectorProps {
  squadPlayers: SquadPlayer[];
  captainId?: string;
  onCaptainChange: (captainId: string | undefined) => void;
}

export const CaptainSelector: React.FC<CaptainSelectorProps> = ({
  squadPlayers,
  captainId,
  onCaptainChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Captain Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={captainId || ''}
          onValueChange={(value) => onCaptainChange(value || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select captain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No captain</SelectItem>
            {squadPlayers.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                {player.name} (#{player.squadNumber})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};
