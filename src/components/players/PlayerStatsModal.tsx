
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Clock, MapPin, RotateCcw, ArrowUpDown } from 'lucide-react';
import { playerStatsService } from '@/services/playerStatsService';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const queryClient = useQueryClient();
  const { matchStats } = player;

  // Get top 3 positions by minutes played
  const topPositions = Object.entries(matchStats.minutesByPosition || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pos, minutes]) => ({ position: pos, minutes }));

  // Calculate average minutes per game
  const avgMinutesPerGame = matchStats.totalGames > 0 ? 
    Math.round(matchStats.totalMinutes / matchStats.totalGames) : 0;

  // Calculate captain percentage
  const captainPercentage = matchStats.totalGames > 0 ? 
    Math.round((matchStats.captainGames / matchStats.totalGames) * 100) : 0;

  // Calculate POTM percentage
  const potmPercentage = matchStats.totalGames > 0 ? 
    Math.round((matchStats.playerOfTheMatchCount / matchStats.totalGames) * 100) : 0;

  const handleRefreshStats = async () => {
    setIsRefreshing(true);
    try {
      await playerStatsService.updatePlayerStats(player.id);
      
      // Invalidate and refetch player data
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      
      toast.success('Match statistics updated successfully');
    } catch (error) {
      console.error('Error refreshing player stats:', error);
      toast.error('Failed to update match statistics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRegenerateStats = async () => {
    setIsRegenerating(true);
    try {
      await playerStatsService.regenerateAllPlayerStats();
      
      // Invalidate and refetch player data
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      
      toast.success('All player statistics regenerated successfully');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      toast.error('Failed to regenerate statistics');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Match Statistics - {player.name}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStats}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateStats}
                disabled={isRegenerating}
                className="flex items-center gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate All
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="categories">Performance Categories</TabsTrigger>
            <TabsTrigger value="recent">Match History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Games</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{matchStats.totalGames}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Minutes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{matchStats.totalMinutes}</div>
                  <div className="text-xs text-muted-foreground">
                    {avgMinutesPerGame} avg per game
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Crown className="h-4 w-4" />
                    Captain
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{matchStats.captainGames}</div>
                  <div className="text-xs text-muted-foreground">
                    {captainPercentage}% of games
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    POTM
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{matchStats.playerOfTheMatchCount}</div>
                  <div className="text-xs text-muted-foreground">
                    {potmPercentage}% of games
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="positions" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Position Breakdown</CardTitle>
                <CardDescription>
                  Minutes played by position across all matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPositions.length > 0 ? (
                  <div className="space-y-3">
                    {topPositions.map(({ position, minutes }, index) => {
                      const percentage = matchStats.totalMinutes > 0 ? 
                        Math.round((minutes / matchStats.totalMinutes) * 100) : 0;
                      
                      return (
                        <div key={position} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-puma-blue-100 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{position}</div>
                              <div className="text-sm text-muted-foreground">
                                {percentage}% of total minutes
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{minutes} mins</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No position data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Categories</CardTitle>
                <CardDescription>
                  Statistics broken down by performance category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matchStats.performanceCategoryStats && Object.keys(matchStats.performanceCategoryStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(matchStats.performanceCategoryStats).map(([categoryName, stats]) => (
                      <Card key={categoryName} className="border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{categoryName}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{stats.totalGames}</div>
                              <div className="text-xs text-muted-foreground">Games</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{stats.totalMinutes}</div>
                              <div className="text-xs text-muted-foreground">Minutes</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{stats.captainGames}</div>
                              <div className="text-xs text-muted-foreground">Captain</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{stats.potmCount}</div>
                              <div className="text-xs text-muted-foreground">POTM</div>
                            </div>
                          </div>
                          
                          {stats.minutesByPosition && Object.keys(stats.minutesByPosition).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Positions Played</Label>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.minutesByPosition).map(([position, minutes]) => (
                                  <Badge key={position} variant="outline" className="text-xs">
                                    {position}: {minutes}m
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance category data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-4 py-4">
            {(matchStats.recentGames || []).length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Match History</CardTitle>
                  <CardDescription>
                    Detailed breakdown of recent matches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead>Performance Category</TableHead>
                        <TableHead>Minutes</TableHead>
                        <TableHead>Position(s)</TableHead>
                        <TableHead>Awards</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(matchStats.recentGames || []).map((game) => (
                        <TableRow key={game.id}>
                          <TableCell>
                            <div className="font-medium">
                              {formatDate(game.date, 'dd MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {game.opponent || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {game.performanceCategory ? (
                              <Badge variant="secondary" className="text-xs">
                                {game.performanceCategory}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">No Category</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {game.minutes} mins
                              {game.wasSubstitute && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  <ArrowUpDown className="h-3 w-3 mr-1" />
                                  Sub
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(game.minutesByPosition || {}).map(([position, minutes]) => (
                                <Badge key={position} variant="outline" className="text-xs">
                                  {position}: {minutes}m
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {game.captain && (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-600 flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  Captain
                                </Badge>
                              )}
                              {game.playerOfTheMatch && (
                                <Badge variant="default" className="bg-purple-500 flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  POTM
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No match history available for this player.
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
