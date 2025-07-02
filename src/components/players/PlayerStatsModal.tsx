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
import { Crown, Trophy, Clock, MapPin, RotateCcw, ArrowUpDown, Users, Timer, Award } from 'lucide-react';
import { playerStatsService } from '@/services/playerStatsService';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { debugPlayerPositions } from '@/utils/debugPlayerPositions';
import { positionDebuggingService } from '@/services/positionDebuggingService';

interface PlayerStatsModalProps {
  player: Player | null;
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

  // Don't render the modal if there's no player
  if (!player) {
    return null;
  }

  const { matchStats } = player;

  // Filter out matches with "Unknown" opponent
  const filteredRecentGames = (matchStats?.recentGames || []).filter(game => 
    game.opponent && game.opponent.toLowerCase() !== 'unknown'
  );

  // Get top 5 positions by minutes played
  const topPositions = Object.entries(matchStats?.minutesByPosition || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([pos, minutes]) => ({ position: pos, minutes: minutes as number }));

  // Calculate average minutes per game
  const avgMinutesPerGame = (matchStats?.totalGames || 0) > 0 ? 
    Math.round((matchStats?.totalMinutes || 0) / (matchStats?.totalGames || 1)) : 0;

  // Calculate captain percentage
  const captainPercentage = (matchStats?.totalGames || 0) > 0 ? 
    Math.round(((matchStats?.captainGames || 0) / (matchStats?.totalGames || 1)) * 100) : 0;

  // Calculate POTM percentage
  const potmPercentage = (matchStats?.totalGames || 0) > 0 ? 
    Math.round(((matchStats?.playerOfTheMatchCount || 0) / (matchStats?.totalGames || 1)) * 100) : 0;

  const renderPositionsPlayed = (minutesByPosition: Record<string, number>) => {
    if (!minutesByPosition || Object.keys(minutesByPosition).length === 0) {
      return <span className="text-muted-foreground">No position data</span>;
    }

    const sortedPositions = Object.entries(minutesByPosition)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1">
        {sortedPositions.map(([position, minutes]) => {
          // Convert position to abbreviation for display
          const abbreviation = getPositionAbbreviation(position);
          return (
            <Badge key={position} variant="outline" className="text-xs">
              {abbreviation}: {minutes}m
            </Badge>
          );
        })}
      </div>
    );
  };

  const getPositionAbbreviation = (position: string): string => {
    // Map full position names to abbreviations
    const positionMap: Record<string, string> = {
      'Goalkeeper': 'GK',
      'Right Back': 'RB',
      'Centre Back': 'CB', 
      'Center Back': 'CB',
      'Left Back': 'LB',
      'Right Midfielder': 'RM',
      'Central Midfielder': 'CM',
      'Centre Midfielder': 'CM',
      'Left Midfielder': 'LM',
      'Defensive Midfielder': 'CDM',
      'Attacking Midfielder': 'CAM',
      'Right Forward': 'RF',
      'Centre Forward': 'CF',
      'Center Forward': 'CF',
      'Left Forward': 'LF',
      'Right Wing': 'RW',
      'Left Wing': 'LW',
      // Legacy mappings
      'Midfielder Right': 'RM',
      'Midfielder Left': 'LM',
      'Midfielder Centre': 'CM',
      'Defender Right': 'RB',
      'Defender Left': 'LB',
      'Striker Centre': 'CF',
      'Substitute': 'SUB'
    };

    return positionMap[position] || position;
  };

  const renderCategoryStats = (categoryStats: Record<string, any>) => {
    if (!categoryStats || Object.keys(categoryStats).length === 0) {
      return <div className="text-center py-4 text-muted-foreground">No performance category data available</div>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(categoryStats).map(([category, stats]) => (
          <Card key={category}>
            <CardContent className="pt-4">
              <h4 className="font-medium mb-2">{category}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Games</p>
                  <p className="font-medium">{stats?.totalGames || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minutes</p>
                  <p className="font-medium">{stats?.totalMinutes || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Captain</p>
                  <p className="font-medium">{stats?.captainGames || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">POTM</p>
                  <p className="font-medium">{stats?.potmCount || 0}</p>
                </div>
              </div>
              {stats?.minutesByPosition && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Positions:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stats.minutesByPosition as Record<string, number>).map(([position, minutes]) => {
                      const abbreviation = getPositionAbbreviation(position);
                      return (
                        <Badge key={position} variant="outline" className="text-xs">
                          {abbreviation}: {minutes}m
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

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
      console.log('🎯 STARTING MANUAL DATA REGENERATION');
      
      // Debug current player positions before regeneration
      await debugPlayerPositions(player.id, player.name);
      
      // Use the service method instead of calling supabase directly
      await playerStatsService.regenerateAllPlayerStats();
      
      // Debug positions after regeneration
      console.log('🎯 POST-REGENERATION DEBUG:');
      await debugPlayerPositions(player.id, player.name);
      
      // Invalidate and refetch player data
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      
      toast.success('All player statistics regenerated successfully - positions should now be accurate');
    } catch (error) {
      console.error('Error regenerating player stats:', error);
      toast.error('Failed to regenerate statistics');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFixPositionsComprehensively = async () => {
    setIsRegenerating(true);
    try {
      console.log('🔧 STARTING COMPREHENSIVE POSITION STANDARDIZATION');
      
      // Test the standardization first
      await playerStatsService.testPositionStandardization();
      
      // Debug current player positions before fix
      await debugPlayerPositions(player.id, player.name);
      
      // Use the new comprehensive position standardization
      await playerStatsService.regenerateAllPlayerStatsWithStandardizedPositions();
      
      // Debug positions after fix
      console.log('🎯 POST-STANDARDIZATION DEBUG:');
      await debugPlayerPositions(player.id, player.name);
      
      // Invalidate and refetch player data
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      
      toast.success('🎉 Position standardization complete! All player stats now use consistent position names based on actual team selections.');
    } catch (error) {
      console.error('Error fixing positions:', error);
      toast.error('Failed to standardize positions');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDebugAndrew = async () => {
    if (player.name === 'Andrew McDonald') {
      setIsRegenerating(true);
      try {
        await positionDebuggingService.debugAndrewMcDonaldData();
        toast.success('Andrew McDonald debugging complete - check console');
      } catch (error) {
        console.error('Error debugging Andrew:', error);
        toast.error('Failed to debug Andrew McDonald data');
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  return (
    <TooltipProvider>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateStats}
                      disabled={isRegenerating}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      Fix All Data
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This will rebuild all statistics from the correct team selection data</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleFixPositionsComprehensively}
                      disabled={isRegenerating}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <RotateCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      Fix Positions
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comprehensive fix: Standardizes all position names and rebuilds statistics to match actual team selections</p>
                  </TooltipContent>
                </Tooltip>
                {player.name === 'Andrew McDonald' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDebugAndrew}
                        disabled={isRegenerating}
                        className="flex items-center gap-2"
                      >
                        🔍 Debug Andrew
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Special debugging for Andrew McDonald's position data issues</p>
                    </TooltipContent>
                  </Tooltip>
                )}
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
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Total Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{matchStats?.totalGames || 0}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      Total Minutes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{matchStats?.totalMinutes || 0}</div>
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
                    <div className="text-2xl font-bold">{matchStats?.captainGames || 0}</div>
                    <div className="text-xs text-muted-foreground">
                      {captainPercentage}% of games
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      POTM
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{matchStats?.playerOfTheMatchCount || 0}</div>
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
                        const percentage = (matchStats?.totalMinutes || 0) > 0 ? 
                          Math.round((minutes / (matchStats?.totalMinutes || 1)) * 100) : 0;
                        
                        return (
                          <div key={position} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-puma-blue-100 flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{getPositionAbbreviation(position)}</div>
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
                  {matchStats?.performanceCategoryStats && Object.keys(matchStats.performanceCategoryStats).length > 0 ? (
                    renderCategoryStats(matchStats.performanceCategoryStats)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No performance category data available.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4 py-4">
              {filteredRecentGames.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Match History</CardTitle>
                    <CardDescription>
                      Recent matches based on actual team selections (positions should be accurate)
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
                        {filteredRecentGames.map((game, index) => (
                          <TableRow key={`${game.id}-${index}`}>
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
                                  {String(game.performanceCategory)}
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
                                {game.minutesByPosition && Object.keys(game.minutesByPosition).length > 0 ? (
                                  Object.entries(game.minutesByPosition as Record<string, number>).map(([position, minutes]) => {
                                    const abbreviation = getPositionAbbreviation(position);
                                    return (
                                      <Badge key={position} variant="outline" className="text-xs">
                                        {abbreviation}: {minutes}m
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-muted-foreground text-xs">No position data</span>
                                )}
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
                  No match history available for this player (excluding unknown opponents).
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
