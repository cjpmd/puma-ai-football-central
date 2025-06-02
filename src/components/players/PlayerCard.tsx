
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Player } from '@/types';
import { 
  MoreVertical, 
  Edit, 
  UserMinus, 
  ArrowRightLeft, 
  Users, 
  Settings, 
  Target, 
  MessageSquare, 
  BarChart3, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Trophy
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
        return (
          <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Improving
          </Badge>
        );
      case 'needs-work':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Needs Work
          </Badge>
        );
      case 'maintaining':
      default:
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50 flex items-center gap-1">
            <Minus className="h-3 w-3" />
            Maintaining
          </Badge>
        );
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green':
        return 'bg-green-500 hover:bg-green-600';
      case 'amber':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'red':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'green':
        return 'Available';
      case 'amber':
        return 'Uncertain';
      case 'red':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  };

  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();

  return (
    <Card className={`h-[440px] flex flex-col ${inactive ? 'opacity-60' : ''}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{player.name}</CardTitle>
              <Badge variant="outline" className="text-xs">
                #{player.squadNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield'}</span>
              <span>•</span>
              <span>Age {age}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
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
                      <Settings className="mr-2 h-4 w-4" />
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
          {/* Status Indicators */}
          <div className="flex items-center justify-between">
            <Badge 
              className={`text-white ${getAvailabilityColor(player.availability)}`}
            >
              {getAvailabilityText(player.availability)}
            </Badge>
            {renderPerformanceIndicator()}
          </div>

          {/* Subscription Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subscription:</span>
            <Badge variant={player.subscriptionType === 'full_squad' ? 'default' : 'secondary'}>
              {player.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training Only'}
            </Badge>
          </div>

          {/* Match Statistics */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Match Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-medium">{player.matchStats?.totalGames || 0}</div>
                <div className="text-xs text-muted-foreground">Games</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-medium">{player.matchStats?.totalMinutes || 0}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
            </div>
            
            {/* Captain and POTM indicators */}
            <div className="flex gap-2">
              {player.matchStats?.captainGames && player.matchStats.captainGames > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600 flex items-center gap-1 text-xs">
                  <Crown className="h-3 w-3" />
                  {player.matchStats.captainGames}
                </Badge>
              )}
              {player.matchStats?.playerOfTheMatchCount && player.matchStats.playerOfTheMatchCount > 0 && (
                <Badge variant="outline" className="border-purple-500 text-purple-600 flex items-center gap-1 text-xs">
                  <Trophy className="h-3 w-3" />
                  {player.matchStats.playerOfTheMatchCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Leave Information for Inactive Players */}
          {inactive && player.leaveDate && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
              <div className="font-medium text-red-800">Left Team</div>
              <div className="text-red-600">{formatDate(player.leaveDate, 'dd MMM yyyy')}</div>
              {player.leaveComments && (
                <div className="text-red-600 text-xs mt-1">{player.leaveComments}</div>
              )}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          {onViewStats && (
            <Button size="sm" variant="outline" onClick={onViewStats} className="flex-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Stats
            </Button>
          )}
          {!inactive && onManageAttributes && (
            <Button size="sm" variant="outline" onClick={onManageAttributes} className="flex-1">
              <Settings className="h-3 w-3 mr-1" />
              Attributes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
