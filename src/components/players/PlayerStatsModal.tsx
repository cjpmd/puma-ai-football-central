
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Player } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PlayerStatsModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  player,
  isOpen,
  onClose
}) => {
  const { matchStats } = player;

  // Get top 3 positions by minutes played
  const topPositions = Object.entries(matchStats.minutesByPosition || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pos, minutes]) => ({ position: pos, minutes }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Match Statistics - {player.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="recent">Recent Games</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Game Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Games:</dt>
                      <dd className="font-medium">{matchStats.totalGames}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Captain Games:</dt>
                      <dd className="font-medium">{matchStats.captainGames}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Player of Match:</dt>
                      <dd className="font-medium">{matchStats.playerOfTheMatchCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total Minutes:</dt>
                      <dd className="font-medium">{matchStats.totalMinutes}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Position Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPositions.length > 0 ? (
                    <dl className="space-y-2">
                      {topPositions.map(({ position, minutes }) => (
                        <div key={position} className="flex justify-between">
                          <dt className="text-muted-foreground">{position}:</dt>
                          <dd className="font-medium">{minutes} mins</dd>
                        </div>
                      ))}
                      
                      {/* Additional stats could go here */}
                    </dl>
                  ) : (
                    <p className="text-center py-2 text-muted-foreground">
                      No position data available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance Trends</CardTitle>
                <CardDescription>
                  Player's performance statistics over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
                {/* This would be replaced with an actual chart component */}
                Charts showing player performance trends will appear here.
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-4 py-4">
            {(matchStats.recentGames || []).length > 0 ? (
              <div className="space-y-4">
                {(matchStats.recentGames || []).map((game) => (
                  <Card key={game.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {game.opponent ? `vs ${game.opponent}` : 'Match'}
                        </CardTitle>
                        <div className="flex gap-2">
                          {game.captain && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">Captain</Badge>
                          )}
                          {game.playerOfTheMatch && (
                            <Badge variant="default" className="bg-purple-500">POTM</Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        {formatDate(game.date, 'PPP')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2">
                        <div>
                          <dt className="text-sm text-muted-foreground">Minutes Played</dt>
                          <dd className="font-medium">{game.minutes}</dd>
                        </div>
                        
                        {Object.entries(game.minutesByPosition || {}).map(([position, minutes]) => (
                          <div key={position}>
                            <dt className="text-sm text-muted-foreground">{position}</dt>
                            <dd className="font-medium">{minutes} mins</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent match data available for this player.
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
