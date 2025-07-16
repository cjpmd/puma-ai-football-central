import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Player } from '@/types';
import { Clock, Target, Crown, Trophy, MapPin } from 'lucide-react';

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
  const stats = player.matchStats || {};
  const totalGames = stats.totalGames || 0;
  const totalMinutes = stats.totalMinutes || 0;
  const captainGames = stats.captainGames || 0;
  const potmCount = stats.playerOfTheMatchCount || 0;
  const minutesByPosition = stats.minutesByPosition || {};
  const recentGames = stats.recentGames || [];

  const topPositions = Object.entries(minutesByPosition)
    .filter(([pos]) => pos !== 'SUB' && pos !== 'TBD')
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3);

  const averageMinutes = totalGames > 0 ? Math.round(totalMinutes / totalGames) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Statistics</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGames}</div>
                <p className="text-xs text-muted-foreground">Total matches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Minutes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMinutes}</div>
                <p className="text-xs text-muted-foreground">Avg: {averageMinutes} per game</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Captain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{captainGames}</div>
                <p className="text-xs text-muted-foreground">Times as captain</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  POTM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{potmCount}</div>
                <p className="text-xs text-muted-foreground">Player of the Match</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Positions */}
          {topPositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Top Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPositions.map(([position, minutes], index) => (
                    <div key={position} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {position}
                        </Badge>
                        <span className="text-sm">{minutes} min</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Games */}
          {recentGames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentGames.slice(0, 5).map((game: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            vs {game.opponent || 'Unknown'}
                          </span>
                          {game.captain && <Crown className="h-3 w-3 text-yellow-500" />}
                          {game.playerOfTheMatch && <Trophy className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(game.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{game.minutes} min</div>
                        <div className="text-xs text-muted-foreground">
                          {game.performanceCategory || 'No category'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {totalGames === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No match statistics available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};