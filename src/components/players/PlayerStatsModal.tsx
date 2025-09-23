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
import { Crown, Trophy, Clock, MapPin, RotateCcw, ArrowUpDown, Users, Timer, Award, BarChart3 } from 'lucide-react';
import { playerStatsService } from '@/services/playerStatsService';
import { availabilityService } from '@/services/availabilityService';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { debugPlayerPositions } from '@/utils/debugPlayerPositions';
import { positionDebuggingService } from '@/services/positionDebuggingService';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useAuth } from '@/contexts/AuthContext';

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
  const [availabilityHistory, setAvailabilityHistory] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const queryClient = useQueryClient();
  const { isGlobalAdmin } = useAuthorization();
  const { user } = useAuth();
  
  // Check if user is authorized for debug functions
  const isAuthorizedForDebug = user?.email === 'chrisjpmcdonald@gmail.com';

  // Load availability history when modal opens
  useEffect(() => {
    if (isOpen && player) {
      loadAvailabilityHistory();
    }
  }, [isOpen, player]);

  const loadAvailabilityHistory = async () => {
    if (!player) return;
    
    setLoadingAvailability(true);
    try {
      const history = await availabilityService.getPlayerAvailabilityHistory(player.id);
      setAvailabilityHistory(history);
    } catch (error) {
      console.error('Error loading availability history:', error);
      toast.error('Failed to load availability history');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleRefreshStats = async () => {
    if (!player) return;
    
    setIsRefreshing(true);
    try {
      await playerStatsService.updatePlayerStats(player.id);
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player stats refreshed successfully');
    } catch (error) {
      console.error('Error refreshing stats:', error);
      toast.error('Failed to refresh stats');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRegenerateStats = async () => {
    if (!player) return;
    
    setIsRegenerating(true);
    try {
      await playerStatsService.regenerateAllPlayerStats();
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player stats regenerated successfully');
    } catch (error) {
      console.error('Error regenerating stats:', error);
      toast.error('Failed to regenerate stats');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFixPositionsComprehensively = async () => {
    if (!player) return;
    
    setIsRegenerating(true);
    try {
      await positionDebuggingService.fixMinutesAggregation();
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player positions fixed comprehensively');
    } catch (error) {
      console.error('Error fixing positions:', error);
      toast.error('Failed to fix positions');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCleanRebuild = async () => {
    if (!player) return;
    
    setIsRegenerating(true);
    try {
      await playerStatsService.debugAndRegenerateForPlayer(player.id, 'PlayerStatsModal');
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player stats clean rebuild completed');
    } catch (error) {
      console.error('Error in clean rebuild:', error);
      toast.error('Failed to perform clean rebuild');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDebugAndrew = async () => {
    if (!player) return;
    
    setIsRegenerating(true);
    try {
      // Use the correct debug function available in the service
      await debugPlayerPositions(player.id, player.name);
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Debug completed for Andrew McDonald');
    } catch (error) {
      console.error('Error debugging Andrew:', error);
      toast.error('Failed to debug Andrew');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!player) {
    return null;
  }

  // Filter out games with empty strings for key fields - use matchStats.recentGames
  const filteredRecentGames = (player.matchStats?.recentGames || []).filter(game => {
    return game.opponent && game.opponent.trim() !== '' && 
           game.date && game.date.trim() !== '' &&
           game.id && game.id.trim() !== '';
  });

  const stats = player.matchStats || {
    totalGames: 0,
    totalMinutes: 0,
    captainGames: 0,
    playerOfTheMatchCount: 0,
    minutesByPosition: {},
    performanceCategoryStats: {}
  };

  // Process positions data from minutesByPosition
  const positionsArray = Object.entries(stats.minutesByPosition || {})
    .map(([position, minutes]) => ({ 
      position, 
      count: Math.round(Number(minutes) / 90) || 1 // Estimate games from minutes
    }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);

  // Process performance categories data
  const performanceCategoriesArray = Object.entries(stats.performanceCategoryStats || {})
    .map(([category, data]) => ({ 
      category, 
      count: typeof data === 'object' ? data.totalGames || 0 : Number(data) || 0
    }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Match Statistics - {player.name}</span>
              {(isGlobalAdmin || user?.email === 'chrisjpmcdonald@gmail.com') && (
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
                  {isAuthorizedForDebug && (
                    <>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleCleanRebuild}
                            disabled={isRegenerating}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <RotateCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                            Clean Rebuild
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clean rebuild: Removes duplicates and rebuilds data to exactly match team selections with position abbreviations</p>
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
                    </>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5 text-xs">
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
              <TabsTrigger value="positions" className="text-xs">Positions</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs">Performance</TabsTrigger>
              <TabsTrigger value="availability" className="text-xs">Availability</TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">Match History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4 py-4 h-[400px] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Total Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalGames || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      Minutes Played
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalMinutes || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Assists
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Crown className="h-4 w-4" />
                      Captain Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.captainGames || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      POTM Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.playerOfTheMatchCount || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Clean Sheets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Rating
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">N/A</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="positions" className="space-y-4 py-4 h-[400px] overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Position Statistics</CardTitle>
                  <CardDescription>
                    Games played by position (based on actual team selections)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {positionsArray.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position</TableHead>
                          <TableHead>Estimated Games</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positionsArray.map((pos, index) => (
                          <TableRow key={`${pos.position}-${index}`}>
                            <TableCell className="font-medium">{pos.position}</TableCell>
                            <TableCell>{pos.count}</TableCell>
                            <TableCell>
                              {stats.totalGames > 0 ? 
                                `${Math.round((pos.count / stats.totalGames) * 100)}%` : 
                                '0%'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No position data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 py-4 h-[400px] overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Categories</CardTitle>
                  <CardDescription>
                    Games by performance rating category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceCategoriesArray.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Games</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceCategoriesArray.map((cat, index) => (
                          <TableRow key={`${cat.category}-${index}`}>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {String(cat.category)}
                              </Badge>
                            </TableCell>
                            <TableCell>{cat.count}</TableCell>
                            <TableCell>
                              {stats.totalGames > 0 ? 
                                `${Math.round((cat.count / stats.totalGames) * 100)}%` : 
                                '0%'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No performance category data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="availability" className="space-y-4 py-4 h-[400px] overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Availability Summary</CardTitle>
                  <CardDescription>
                    Player's availability status breakdown by event type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAvailability ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading availability history...</p>
                    </div>
                  ) : availabilityHistory.length > 0 ? (
                    <div className="space-y-6">
                      {/* Summary Statistics */}
                      <div className="space-y-4">
                        <h3 className="text-md font-semibold">Summary by Event Type</h3>
                        {(() => {
                          // Calculate percentages by event type
                          const eventTypeStats = availabilityHistory.reduce((acc, item) => {
                            const eventType = item.eventType || 'Unknown';
                            if (!acc[eventType]) {
                              acc[eventType] = { total: 0, available: 0, unavailable: 0, pending: 0 };
                            }
                            acc[eventType].total++;
                            acc[eventType][item.status as 'available' | 'unavailable' | 'pending']++;
                            return acc;
                          }, {} as Record<string, { total: number; available: number; unavailable: number; pending: number }>);

                          return Object.entries(eventTypeStats).map(([eventType, stats]) => {
                            const typedStats = stats as { total: number; available: number; unavailable: number; pending: number };
                            return (
                              <div key={eventType} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium">{eventType}</h4>
                                  <Badge variant="outline">{typedStats.total} events</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                      {typedStats.total > 0 ? Math.round((typedStats.available / typedStats.total) * 100) : 0}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Available</div>
                                    <div className="text-xs text-muted-foreground">({typedStats.available})</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                      {typedStats.total > 0 ? Math.round((typedStats.unavailable / typedStats.total) * 100) : 0}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Unavailable</div>
                                    <div className="text-xs text-muted-foreground">({typedStats.unavailable})</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-amber-600">
                                      {typedStats.total > 0 ? Math.round((typedStats.pending / typedStats.total) * 100) : 0}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Pending</div>
                                    <div className="text-xs text-muted-foreground">({typedStats.pending})</div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Detailed History Table */}
                      <div className="space-y-2">
                        <h3 className="text-md font-semibold">Detailed History</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Opponent</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Response</TableHead>
                              <TableHead>Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {availabilityHistory.map((item, index) => (
                              <TableRow key={`${item.id}-${index}`}>
                                <TableCell>
                                  <div className="font-medium">
                                    {formatDate(item.eventDate, 'dd MMM yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {item.eventTitle || 'Untitled Event'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.eventType || 'Unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-muted-foreground">
                                    {item.opponent || 'N/A'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      item.status === 'available' ? 'default' : 
                                      item.status === 'unavailable' ? 'destructive' : 
                                      'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(item.responseTime, 'dd MMM HH:mm')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.source || 'Manual'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No availability history found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4 py-4 h-[400px] overflow-y-auto">
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
                                <Timer className="h-3 w-3 text-muted-foreground" />
                                <span>{game.minutes || 0}'</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {game.minutesByPosition && Object.keys(game.minutesByPosition).length > 0 ? (
                                  Object.keys(game.minutesByPosition).map((pos, posIndex) => (
                                    <Badge key={posIndex} variant="outline" className="text-xs">
                                      {pos}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-xs">No position</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {game.captain && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                                {game.playerOfTheMatch && (
                                  <Trophy className="h-3 w-3 text-blue-500" />
                                )}
                                {!game.captain && !game.playerOfTheMatch && (
                                  <span className="text-muted-foreground text-xs">-</span>
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
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent games found</p>
                    </div>
                  </CardContent>
                </Card>
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