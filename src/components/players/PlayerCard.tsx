import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Player } from '@/types';
import { calculateAge, formatDate } from '@/lib/utils';
import { ArrowRightLeft, Edit, Trash, UserPlus, Settings, User, Users, UserMinus, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { calculatePerformanceTrend, getPerformanceIcon, getPerformanceColor, PerformanceTrend } from '@/utils/performanceUtils';

interface PlayerCardProps {
  player: Player;
  inactive?: boolean;
  onEdit?: () => void;
  onLeave?: () => void;
  onResurrect?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void;
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
  onResurrect,
  onDelete,
  onTransfer,
  onManageParents,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory
}) => {
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend>('maintaining');
  const [loadingTrend, setLoadingTrend] = useState(true);

  useEffect(() => {
    const loadPerformanceTrend = async () => {
      if (!inactive) {
        try {
          const trend = await calculatePerformanceTrend(player.id);
          setPerformanceTrend(trend);
        } catch (error) {
          console.error('Error loading performance trend:', error);
        }
      }
      setLoadingTrend(false);
    };

    loadPerformanceTrend();
  }, [player.id, inactive]);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'green': return 'Available';
      case 'amber': return 'Uncertain';
      case 'red': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const getSubscriptionTypeLabel = (type?: string) => {
    switch (type) {
      case 'full_squad': return 'Full Squad';
      case 'training': return 'Training Only';
      default: return 'Unknown';
    }
  };

  const playerAge = player.dateOfBirth ? calculateAge(new Date(player.dateOfBirth)) : null;
  const performanceIconName = getPerformanceIcon(performanceTrend);
  const performanceColor = getPerformanceColor(performanceTrend);

  const renderPerformanceIcon = () => {
    if (loadingTrend || !performanceIconName) return null;
    
    const IconComponent = performanceIconName === 'arrow-up' ? ArrowUp : ArrowDown;
    
    return (
      <IconComponent 
        className={`h-4 w-4 ${performanceColor}`}
      />
    );
  };

  return (
    <Card className={`relative ${inactive ? 'bg-gray-50 border-gray-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-10 w-10 border-2 border-puma-blue-500">
              <AvatarFallback className="text-sm bg-puma-blue-100 text-puma-blue-500">
                {player.squadNumber || ""}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{player.name}</CardTitle>
                {!inactive && renderPerformanceIcon()}
              </div>
              <CardDescription>
                {playerAge !== null && `${playerAge} years • `}
                {player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield Player'}
              </CardDescription>
            </div>
          </div>
          {!inactive && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(player.availability)}`} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {!inactive && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={player.availability === 'green' ? 'default' : 'secondary'}>
                {getAvailabilityText(player.availability)}
              </Badge>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subscription:</span>
            <span className="font-medium">
              {getSubscriptionTypeLabel(player.subscriptionType)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Games:</span>
            <span className="font-medium">
              {player.matchStats?.totalGames || 0}
            </span>
          </div>
          {inactive && player.leaveDate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Left Team:</span>
              <span className="font-medium">
                {formatDate(player.leaveDate, 'dd MMM yyyy')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {inactive ? (
          <>
            {onViewStats && (
              <Button variant="outline" size="sm" onClick={onViewStats}>
                Stats
              </Button>
            )}
            <div className="flex space-x-2">
              {onResurrect && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onResurrect}>
                  Resurrect
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="destructive" onClick={onDelete}>
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onManageParents}>
              <UserPlus className="mr-2 h-4 w-4" />
              Parent
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Player Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Details</span>
                  </DropdownMenuItem>
                )}
                {onManageAttributes && (
                  <DropdownMenuItem onClick={onManageAttributes}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Attributes</span>
                  </DropdownMenuItem>
                )}
                {onManageObjectives && (
                  <DropdownMenuItem onClick={onManageObjectives}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Objectives</span>
                  </DropdownMenuItem>
                )}
                {onManageComments && (
                  <DropdownMenuItem onClick={onManageComments}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Comments</span>
                  </DropdownMenuItem>
                )}
                {onViewStats && (
                  <DropdownMenuItem onClick={onViewStats}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Match Stats</span>
                  </DropdownMenuItem>
                )}
                {onViewHistory && (
                  <DropdownMenuItem onClick={onViewHistory}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Player History</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onTransfer && (
                  <DropdownMenuItem onClick={onTransfer}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    <span>Transfer Player</span>
                  </DropdownMenuItem>
                )}
                {onLeave && (
                  <DropdownMenuItem onClick={onLeave} className="text-red-600">
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span>Leave Team</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
