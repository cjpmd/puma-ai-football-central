
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Player } from '@/types';
import { Edit, Users, TrendingUp, TrendingDown, Minus, User, Calendar, Hash, Shirt, UserMinus, ArrowRightLeft, Trash2, RotateCcw, Settings, Crown, Trophy, BarChart3, Target } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onEdit?: (player: Player) => void;
  onManageParents?: (player: Player) => void;
  showSubscription?: boolean;
  inactive?: boolean;
  onLeave?: (player: Player) => void;
  onTransfer?: (player: Player) => void;
  onManageAttributes?: (player: Player) => void;
  onManageObjectives?: (player: Player) => void;
  onManageComments?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
  onViewHistory?: (player: Player) => void;
  onResurrect?: (player: Player) => void;
  onDelete?: (player: Player) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onEdit,
  onManageParents,
  showSubscription = true,
  inactive = false,
  onLeave,
  onTransfer,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
  onResurrect,
  onDelete
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case 'full_squad': return 'Full Squad';
      case 'training': return 'Training Only';
      case 'trialist': return 'Trialist';
      default: return type;
    }
  };

  const getPerformanceIcon = () => {
    const attributes = player.attributes || [];
    if (attributes.length === 0) return <Minus className="h-4 w-4 text-gray-400" />;
    
    const avgValue = attributes.reduce((sum, attr) => sum + attr.value, 0) / attributes.length;
    
    if (avgValue >= 7) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (avgValue <= 4) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // Check for missing critical information with specific icons
  const getMissingInfoAlerts = () => {
    const alerts = [];
    
    if (!player.name || player.name.trim().length === 0) {
      alerts.push({ icon: User, message: 'Missing player name' });
    }
    
    if (!player.dateOfBirth) {
      alerts.push({ icon: Calendar, message: 'Missing date of birth' });
    }
    
    if (!player.squadNumber || player.squadNumber === 0) {
      alerts.push({ icon: Hash, message: 'Missing squad number' });
    }
    
    const kitSizes = player.kit_sizes || {};
    if (Object.keys(kitSizes).length === 0 || !kitSizes.nameOnShirt) {
      alerts.push({ icon: Shirt, message: 'Missing kit information' });
    }
    
    return alerts;
  };

  const missingInfoAlerts = getMissingInfoAlerts();
  const hasAlerts = missingInfoAlerts.length > 0;

  // Calculate total minutes by position
  const getTotalMinutesByPosition = () => {
    const minutesByPosition = player.matchStats?.minutesByPosition || {};
    return Object.entries(minutesByPosition)
      .map(([position, minutes]) => ({
        position,
        minutes: Number(minutes) || 0
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 3); // Show top 3 positions
  };

  const isCaptain = player.matchStats?.captainGames > 0;
  const isPOTM = player.matchStats?.playerOfTheMatchCount > 0;
  const topPositions = getTotalMinutesByPosition();

  return (
    <Card className={`hover:shadow-lg transition-shadow h-[440px] flex flex-col ${inactive ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg font-bold leading-tight">
              <span className="truncate">{player.name || 'Unnamed Player'}</span>
              <span className="text-xl font-bold flex-shrink-0">#{player.squadNumber || 'No Number'}</span>
              {hasAlerts && !inactive && (
                <div className="flex gap-1 flex-shrink-0">
                  {missingInfoAlerts.map((alert, index) => {
                    const IconComponent = alert.icon;
                    return (
                      <span key={index} title={alert.message}>
                        <IconComponent className="h-4 w-4 text-orange-500" />
                      </span>
                    );
                  })}
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {player.type === 'goalkeeper' ? 'GK' : 'Outfield'} • Age {player.dateOfBirth ? new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear() : 0}
              </span>
              {!inactive && <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(player.availability)}`} />}
              {getPerformanceIcon()}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {inactive ? (
              <>
                {onResurrect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResurrect(player)}
                    className="h-8 w-8 p-0"
                    title="Return to Squad"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(player)}
                    className="h-8 w-8 p-0 text-red-600"
                    title="Delete Player"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 p-0"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-3">
        {/* Subscription Badge - Fixed Position */}
        <div className="h-6 flex items-center">
          {showSubscription && !inactive && (
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
              {getSubscriptionLabel(player.subscriptionType || 'full_squad')}
            </Badge>
          )}
        </div>

        {/* Stats Grid - Fixed Position */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{player.matchStats?.totalGames || 0}</div>
            <div className="text-sm text-muted-foreground">Games</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{player.matchStats?.totalMinutes || 0}</div>
            <div className="text-sm text-muted-foreground">Minutes</div>
          </div>
        </div>

        {/* Captain and POTM badges - Fixed Height Area */}
        <div className="h-6 flex gap-2 justify-center">
          {isCaptain && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">{player.matchStats?.captainGames}</span>
            </div>
          )}
          {isPOTM && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">{player.matchStats?.playerOfTheMatchCount}</span>
            </div>
          )}
        </div>

        {/* Top Positions - Fixed Height Area */}
        <div className="h-12 text-center">
          {topPositions.length > 0 && (
            <>
              <div className="text-sm font-medium mb-1">Top Positions</div>
              <div className="text-xs text-muted-foreground">
                {topPositions.map(({ position, minutes }, index) => (
                  <span key={position}>
                    {index > 0 && ' • '}
                    <span className="font-medium uppercase">{position}</span> {minutes}m
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Leave Date for Inactive Players */}
        {inactive && player.leaveDate && (
          <div className="text-sm text-muted-foreground text-center">
            Left: {new Date(player.leaveDate).toLocaleDateString()}
          </div>
        )}

        {/* Main Action Buttons - Fixed Position */}
        {!inactive && (
          <div className="flex gap-2 mt-auto">
            {onViewStats && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewStats(player)}
                className="flex-1 text-xs"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Stats
              </Button>
            )}
            {onManageAttributes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageAttributes(player)}
                className="flex-1 text-xs"
              >
                <Target className="h-4 w-4 mr-1" />
                Attributes
              </Button>
            )}
          </div>
        )}

        {/* Settings Panel - Expandable */}
        {showSettings && !inactive && (
          <div className="border-t pt-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(player)} className="text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {onManageParents && (
                <Button variant="outline" size="sm" onClick={() => onManageParents(player)} className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Parents
                </Button>
              )}
              {onManageObjectives && (
                <Button variant="outline" size="sm" onClick={() => onManageObjectives(player)} className="text-xs">
                  Objectives
                </Button>
              )}
              {onManageComments && (
                <Button variant="outline" size="sm" onClick={() => onManageComments(player)} className="text-xs">
                  Comments
                </Button>
              )}
              {onViewHistory && (
                <Button variant="outline" size="sm" onClick={() => onViewHistory(player)} className="text-xs">
                  History
                </Button>
              )}
              {onTransfer && (
                <Button variant="outline" size="sm" onClick={() => onTransfer(player)} className="text-xs">
                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                  Transfer
                </Button>
              )}
              {onLeave && (
                <Button variant="outline" size="sm" onClick={() => onLeave(player)} className="text-xs text-red-600">
                  <UserMinus className="h-3 w-3 mr-1" />
                  Leave
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Inactive Player Actions - Fixed Position */}
        {inactive && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {onViewStats && (
              <Button variant="outline" size="sm" onClick={() => onViewStats(player)} className="text-xs">
                Stats
              </Button>
            )}
            {onViewHistory && (
              <Button variant="outline" size="sm" onClick={() => onViewHistory(player)} className="text-xs">
                History
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
