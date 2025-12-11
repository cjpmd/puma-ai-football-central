import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from '@/types';
import { Clock, Target, Crown, Trophy, MapPin, Calendar, BarChart3, TrendingUp, History, CheckCircle, Goal, Shield, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { availabilityService } from '@/services/availabilityService';
import { format as formatDate } from 'date-fns';

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

  // Availability state
  const [availabilityHistory, setAvailabilityHistory] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const topPositions = Object.entries(minutesByPosition)
    .filter(([pos]) => pos !== 'SUB' && pos !== 'TBD')
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3);

  const allPositions = Object.entries(minutesByPosition)
    .filter(([pos]) => pos !== 'SUB' && pos !== 'TBD')
    .sort(([,a], [,b]) => (b as number) - (a as number));

  const averageMinutes = totalGames > 0 ? Math.round(totalMinutes / totalGames) : 0;

  // Load availability data when modal opens
  useEffect(() => {
    if (isOpen && player.id) {
      setLoadingAvailability(true);
      availabilityService.getPlayerAvailabilityHistory(player.id)
        .then((data) => {
          setAvailabilityHistory(data);
        })
        .catch((error) => {
          console.error('Error loading availability history:', error);
          setAvailabilityHistory([]);
        })
        .finally(() => {
          setLoadingAvailability(false);
        });
    }
  }, [isOpen, player.id]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Player Statistics
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{player.name}</p>
        </SheetHeader>
        
        <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-5 mt-4 h-12 text-xs w-[calc(100%-2rem)] mx-auto">
            <TabsTrigger value="summary" className="flex flex-col items-center gap-0.5 px-1">
              <Target className="h-3 w-3" />
              <span className="text-xs">Sum</span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="flex flex-col items-center gap-0.5 px-1">
              <MapPin className="h-3 w-3" />
              <span className="text-xs">Pos</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex flex-col items-center gap-0.5 px-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Perf Cat</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex flex-col items-center gap-0.5 px-1">
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs">Avail</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col items-center gap-0.5 px-1">
              <History className="h-3 w-3" />
              <span className="text-xs">Hist</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="summary" className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-6 h-[60vh]">
                <div className="space-y-6 py-4">
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

                {/* Game Day Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Goal className="h-4 w-4" />
                      Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalGoals || 0}</div>
                    <p className="text-xs text-muted-foreground">Total goals scored</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Assists
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAssists || 0}</div>
                    <p className="text-xs text-muted-foreground">Total assists</p>
                  </CardContent>
                </Card>

                {/* Saves - typically for goalkeepers */}
                {(stats.totalSaves || 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Saves
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalSaves || 0}</div>
                      <p className="text-xs text-muted-foreground">Total saves</p>
                    </CardContent>
                  </Card>
                )}

                {/* Cards */}
                {((stats.yellowCards || 0) > 0 || (stats.redCards || 0) > 0) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Square className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        Cards
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-xl font-bold">{stats.yellowCards || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4 fill-red-500 text-red-500" />
                          <span className="text-xl font-bold">{stats.redCards || 0}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Yellow / Red</p>
                    </CardContent>
                  </Card>
                )}
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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="positions" className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-6 h-[60vh]">
                <div className="space-y-4 py-4">
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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance" className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-6 h-[60vh]">
                <div className="space-y-4 py-4">
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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="availability" className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-6 h-[60vh]">
                <div className="space-y-4 py-4">
                  {loadingAvailability ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading availability...</p>
                      </CardContent>
                    </Card>
                  ) : availabilityHistory.length > 0 ? (
                    <>
                      {/* Summary Stats */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Availability Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const eventTypeStats = availabilityHistory.reduce((acc, item) => {
                              const eventType = item.eventType || 'Unknown';
                              if (!acc[eventType]) {
                                acc[eventType] = { total: 0, available: 0, unavailable: 0, pending: 0 };
                              }
                              acc[eventType].total++;
                              acc[eventType][item.status as 'available' | 'unavailable' | 'pending']++;
                              return acc;
                            }, {} as Record<string, { total: number; available: number; unavailable: number; pending: number }>);

                            return (
                              <div className="space-y-3">
                                {Object.entries(eventTypeStats).map(([eventType, stats]) => {
                                  const typedStats = stats as { total: number; available: number; unavailable: number; pending: number };
                                  return (
                                  <div key={eventType} className="p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-sm">{eventType}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {typedStats.total} events
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-green-600">
                                          {typedStats.total > 0 ? Math.round((typedStats.available / typedStats.total) * 100) : 0}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Available</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-red-600">
                                          {typedStats.total > 0 ? Math.round((typedStats.unavailable / typedStats.total) * 100) : 0}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Unavailable</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-lg font-bold text-amber-600">
                                          {typedStats.total > 0 ? Math.round((typedStats.pending / typedStats.total) * 100) : 0}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Pending</div>
                                      </div>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {/* Recent Availability */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Recent Events
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {availabilityHistory.slice(0, 8).map((item, index) => (
                              <div key={`${item.id}-${index}`} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {item.eventType}
                                    </Badge>
                                    <Badge 
                                      variant={
                                        item.status === 'available' ? 'default' :
                                        item.status === 'unavailable' ? 'destructive' :
                                        'secondary'
                                      }
                                      className={`text-xs ${
                                        item.status === 'available' ? 'bg-green-500 hover:bg-green-600' :
                                        item.status === 'unavailable' ? 'bg-red-500 hover:bg-red-600' :
                                        'bg-amber-500 hover:bg-amber-600'
                                      }`}
                                    >
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs font-medium">
                                    {item.eventTitle || 'Untitled Event'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(item.eventDate, 'dd MMM yyyy')}
                                    {item.opponent && ` vs ${item.opponent}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No availability history found</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="h-full data-[state=active]:flex data-[state=active]:flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-6 h-[60vh]">
                <div className="space-y-4 py-4">
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
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};