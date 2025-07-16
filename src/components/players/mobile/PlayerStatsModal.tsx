import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Player } from '@/types';
import { Clock, Target, Crown, Trophy, MapPin, Calendar, BarChart3 } from 'lucide-react';

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
  const stats = (player.matchStats as any) || {};
  const totalGames = stats.totalGames || 0;
  const totalMinutes = stats.totalMinutes || 0;
  const captainGames = stats.captainGames || 0;
  const potmCount = stats.playerOfTheMatchCount || 0;
  const minutesByPosition = stats.minutesByPosition || {};
  const recentGames = stats.recentGames || [];
  const performanceCategoryStats = stats.performanceCategoryStats || {};

  const topPositions = Object.entries(minutesByPosition)
    .filter(([pos]) => pos !== 'SUB' && pos !== 'TBD')
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3);

  const allPositions = Object.entries(minutesByPosition)
    .filter(([pos]) => pos !== 'SUB' && pos !== 'TBD')
    .sort(([,a], [,b]) => (b as number) - (a as number));

  const averageMinutes = totalGames > 0 ? Math.round(totalMinutes / totalGames) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Player Statistics</SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="summary" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-6 mt-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="flex-1 overflow-y-auto p-6 space-y-6">
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
                              {String(position)}
                            </Badge>
                            <span className="text-sm">{Number(minutes)} min</span>
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

              {totalGames === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No match statistics available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="positions" className="flex-1 overflow-y-auto p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    All Positions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allPositions.length > 0 ? (
                    <div className="space-y-3">
                      {allPositions.map(([position, minutes], index) => (
                        <div key={position} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {String(position)}
                            </Badge>
                            <span className="text-sm font-medium">{String(position)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{Number(minutes)} min</div>
                            <div className="text-xs text-muted-foreground">
                              {totalMinutes > 0 ? Math.round((Number(minutes) / totalMinutes) * 100) : 0}% of total
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No position data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="flex-1 overflow-y-auto p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(performanceCategoryStats).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(performanceCategoryStats).map(([category, stats]: [string, any]) => (
                        <div key={category} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{category}</h4>
                            <Badge variant="outline" className="text-xs">
                              {stats.games} games
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Total Minutes:</span>
                              <div className="font-medium">{stats.minutes}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Minutes:</span>
                              <div className="font-medium">{stats.averageMinutes}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">As Captain:</span>
                              <div className="font-medium">{stats.captainGames}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No performance category data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto p-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Match History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentGames.length > 0 ? (
                    <div className="space-y-3">
                      {recentGames.map((game: any, index: number) => (
                        <div key={index} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                vs {game.opponent || 'Unknown'}
                              </span>
                              {game.captain && <Crown className="h-3 w-3 text-yellow-500" />}
                              {game.playerOfTheMatch && <Trophy className="h-3 w-3 text-amber-500" />}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(game.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Minutes:</span>
                              <div className="font-medium">{game.minutes}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Performance:</span>
                              <div className="font-medium">{game.performanceCategory || 'None'}</div>
                            </div>
                          </div>
                          {game.minutesByPosition && Object.keys(game.minutesByPosition).length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-xs text-muted-foreground">Positions:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(game.minutesByPosition).map(([pos, mins]) => (
                                  <Badge key={pos} variant="outline" className="text-xs">
                                    {pos}: {Number(mins)}min
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No match history available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};