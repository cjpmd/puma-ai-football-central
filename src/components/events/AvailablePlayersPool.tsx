import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface AvailablePlayersPoolProps {
  players: SquadPlayer[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  globalCaptainId?: string;
  nameDisplayOption: 'surname' | 'initials' | 'first' | 'full';
}

export const AvailablePlayersPool: React.FC<AvailablePlayersPoolProps> = ({
  players,
  isOpen,
  onToggle,
  globalCaptainId,
  nameDisplayOption
}) => {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="print:shadow-none print:border">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 print:hover:bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Available Players ({players.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {players.length === 0 && (
                  <Badge variant="secondary" className="text-xs">All assigned</Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-[60px] print:bg-gray-100">
              {players.map((player) => (
                <PlayerIcon 
                  key={player.id}
                  player={player} 
                  isCaptain={player.id === globalCaptainId}
                  nameDisplayOption={nameDisplayOption}
                  isCircular={true}
                />
              ))}
              {players.length === 0 && (
                <div className="text-sm text-muted-foreground">All available players are assigned</div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};