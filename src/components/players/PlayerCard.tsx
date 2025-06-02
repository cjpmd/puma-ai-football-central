
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Player } from '@/types';
import { 
  Edit, 
  UserMinus, 
  ArrowRightLeft, 
  Users, 
  Cog, 
  Target, 
  MessageSquare, 
  BarChart3, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Trophy,
  Brain
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { calculatePerformanceTrend, PerformanceTrend } from '@/utils/performanceUtils';

interface PlayerCardProps {
  player: Player;
  inactive?: boolean;
  onEdit?: () => void;
  onLeave?: () => void;
  onTransfer?: () => void;
  onResurrect?: () => void;
  onDelete?: () => void;
  onManageParents?: () => void;
  onManageAttributes?: () => void;
  onManageObjectives?: () => void;
  onManageComments?: () => void;
  onViewStats?: () => void;
  onViewHistory?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  inactive = false,
  onEdit,
  onLeave,
  onTransfer,
  onResurrect,
  onDelete,
  onManageParents,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
}) => {
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend>('maintaining');

  useEffect(() => {
    if (!inactive) {
      const loadPerformanceTrend = async () => {
        try {
          const trend = await calculatePerformanceTrend(player.id);
          setPerformanceTrend(trend);
        } catch (error) {
          console.error(`Error loading trend for player ${player.id}:`, error);
          setPerformanceTrend('maintaining');
        }
      };

      loadPerformanceTrend();
    }
  }, [player.id, inactive]);

  const renderPerformanceIndicator = () => {
    if (inactive) return null;

    switch (performanceTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'needs-work':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'maintaining':
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderTopPositions = () => {
    const positions = player.matchStats?.minutesByPosition || {};
    
    // Convert positions object to array and ensure values are numbers
    const positionEntries = Object.entries(positions).map(([position, minutes]) => [
      position, 
      typeof minutes === 'number' ? minutes : 0
    ] as [string, number]);
    
    const sortedPositions = positionEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (sortedPositions.length === 0) {
      return <span className="text-muted-foreground text-xs">No position data</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {sortedPositions.map(([position, minutes]) => (
          <span key={position} className="text-xs">
            <span className="font-medium">{position}</span>
            <span className="text-muted-foreground ml-1">{minutes}m</span>
          </span>
        ))}
      </div>
    );
  };

  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();
  const captainGames = player.matchStats?.captainGames || 0;
  const potmCount = player.matchStats?.playerOfTheMatchCount || 0;

  return (
    <Card className={`h-[340px] flex flex-col ${inactive ? 'opacity-60' : ''}`}>
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-sm">{player.name}</CardTitle>
              <Badge variant="outline" className="text-xs">
                #{player.squadNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{player.type === 'goalkeeper' ? 'GK' : 'Outfield'}</span>
              <span>•</span>
              <span>Age {age}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Cog className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!inactive ? (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Player
                    </DropdownMenuItem>
                  )}
                  {onManageParents && (
                    <DropdownMenuItem onClick={onManageParents}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Parents
                    </DropdownMenuItem>
                  )}
                  {onManageAttributes && (
                    <DropdownMenuItem onClick={onManageAttributes}>
                      <Brain className="mr-2 h-4 w-4" />
                      Manage Attributes
                    </DropdownMenuItem>
                  )}
                  {onManageObjectives && (
                    <DropdownMenuItem onClick={onManageObjectives}>
                      <Target className="mr-2 h-4 w-4" />
                      Manage Objectives
                    </DropdownMenuItem>
                  )}
                  {onManageComments && (
                    <DropdownMenuItem onClick={onManageComments}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Manage Comments
                    </DropdownMenuItem>
                  )}
                  {onViewStats && (
                    <DropdownMenuItem onClick={onViewStats}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Statistics
                    </DropdownMenuItem>
                  )}
                  {onViewHistory && (
                    <DropdownMenuItem onClick={onViewHistory}>
                      <Calendar className="mr-2 h-4 w-4" />
                      View History
                    </DropdownMenuItem>
                  )}
                  {onTransfer && (
                    <DropdownMenuItem onClick={onTransfer}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Transfer Player
                    </DropdownMenuItem>
                  )}
                  {onLeave && (
                    <DropdownMenuItem onClick={onLeave} className="text-red-600">
                      <UserMinus className="mr-2 h-4 w-4" />
                      Leave Team
                    </DropdownMenuItem>
                  )}
                </>
              ) : (
                <>
                  {onViewStats && (
                    <DropdownMenuItem onClick={onViewStats}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Statistics
                    </DropdownMenuItem>
                  )}
                  {onViewHistory && (
                    <DropdownMenuItem onClick={onViewHistory}>
                      <Calendar className="mr-2 h-4 w-4" />
                      View History
                    </DropdownMenuItem>
                  )}
                  {onResurrect && (
                    <DropdownMenuItem onClick={onResurrect} className="text-green-600">
                      <Users className="mr-2 h-4 w-4" />
                      Return to Squad
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-red-600">
                      <UserMinus className="mr-2 h-4 w-4" />
                      Delete Permanently
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {/* Performance and Subscription */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={player.subscriptionType === 'full_squad' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {player.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training Only'}
            </Badge>
            {renderPerformanceIndicator()}
          </div>

          {/* Match Statistics */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Match Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-1 bg-muted rounded">
                <div className="font-medium">{player.matchStats?.totalGames || 0}</div>
                <div className="text-xs text-muted-foreground">Games</div>
              </div>
              <div className="text-center p-1 bg-muted rounded">
                <div className="font-medium">{player.matchStats?.totalMinutes || 0}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
            </div>
            
            {/* Captain and POTM indicators - only show if they have counts */}
            {(captainGames > 0 || potmCount > 0) && (
              <div className="flex gap-1">
                {captainGames > 0 && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 flex items-center gap-1 text-xs px-1 py-0">
                    <Crown className="h-2 w-2" />
                    {captainGames}
                  </Badge>
                )}
                {potmCount > 0 && (
                  <Badge variant="outline" className="border-purple-500 text-purple-600 flex items-center gap-1 text-xs px-1 py-0">
                    <Trophy className="h-2 w-2" />
                    {potmCount}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Top 3 Positions */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Top Positions</h4>
            <div className="text-xs">
              {renderTopPositions()}
            </div>
          </div>

          {/* Leave Information for Inactive Players */}
          {inactive && player.leaveDate && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <div className="font-medium text-red-800">Left Team</div>
              <div className="text-red-600">{formatDate(player.leaveDate, 'dd MMM yyyy')}</div>
              {player.leaveComments && (
                <div className="text-red-600 text-xs mt-1">{player.leaveComments}</div>
              )}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-1 mt-2 pt-2 border-t">
          {onViewStats && (
            <Button size="sm" variant="outline" onClick={onViewStats} className="flex-1 text-xs h-7">
              <BarChart3 className="h-2 w-2 mr-1" />
              Stats
            </Button>
          )}
          {!inactive && onManageAttributes && (
            <Button size="sm" variant="outline" onClick={onManageAttributes} className="flex-1 text-xs h-7">
              <Brain className="h-2 w-2 mr-1" />
              Attributes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
