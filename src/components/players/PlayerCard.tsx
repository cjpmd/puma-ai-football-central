
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Player } from '@/types';
import { Edit, Users, TrendingUp, TrendingDown, Minus, AlertTriangle, UserMinus, ArrowRightLeft, Trash2, RotateCcw, Settings, Crown, Trophy } from 'lucide-react';

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

  const getSubscriptionBadgeVariant = (type: string) => {
    switch (type) {
      case 'full_squad': return 'default';
      case 'training': return 'secondary';
      case 'trialist': return 'outline';
      default: return 'secondary';
    }
  };

  const getPerformanceIcon = () => {
    // Simple performance calculation based on attributes
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

  // Check for missing critical information
  const getMissingInfoAlerts = () => {
    const alerts = [];
    
    if (!player.name || player.name.trim().length === 0) {
      alerts.push('Missing player name');
    }
    
    if (!player.dateOfBirth) {
      alerts.push('Missing date of birth');
    }
    
    if (!player.squadNumber || player.squadNumber === 0) {
      alerts.push('Missing squad number');
    }
    
    const kitSizes = player.kit_sizes || {};
    if (Object.keys(kitSizes).length === 0 || !kitSizes.nameOnShirt) {
      alerts.push('Missing kit information');
    }
    
    return alerts;
  };

  const missingInfoAlerts = getMissingInfoAlerts();
  const hasAlerts = missingInfoAlerts.length > 0;

  // Calculate total minutes by position
  const getTotalMinutesByPosition = () => {
    const minutesByPosition = player.matchStats?.minutesByPosition || {};
    return Object.entries(minutesByPosition).map(([position, minutes]) => ({
      position,
      minutes: Number(minutes) || 0
    }));
  };

  const isCaptain = player.matchStats?.captainGames > 0;
  const isPOTM = player.matchStats?.playerOfTheMatchCount > 0;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${hasAlerts ? 'border-orange-200 bg-orange-50' : ''} ${inactive ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {player.name || 'Unnamed Player'}
              {isCaptain && (
                <span title="Captain">
                  <Crown className="h-4 w-4 text-yellow-600" />
                </span>
              )}
              {isPOTM && (
                <span title="Player of the Match">
                  <Trophy className="h-4 w-4 text-gold-600" />
                </span>
              )}
              {hasAlerts && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              {!inactive && <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(player.availability)}`} />}
              {getPerformanceIcon()}
            </CardTitle>
            <CardDescription>
              #{player.squadNumber || 'No Number'} • {player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield'}
              {inactive && ' • Left Team'}
            </CardDescription>
          </div>
          <div className="flex gap-1">
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
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-8 w-8 p-0"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(player)}
                    className="h-8 w-8 p-0"
                    title="Edit Player"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hasAlerts && !inactive && (
            <div className="p-2 bg-orange-100 border border-orange-200 rounded text-sm">
              <div className="font-medium text-orange-800 mb-1">Action Required:</div>
              <ul className="text-orange-700 text-xs space-y-1">
                {missingInfoAlerts.map((alert, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {showSubscription && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subscription:</span>
              <Badge variant={getSubscriptionBadgeVariant(player.subscriptionType || 'full_squad')}>
                {getSubscriptionLabel(player.subscriptionType || 'full_squad')}
              </Badge>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Games:</span>
            <span className="text-sm font-medium">
              {player.matchStats?.totalGames || 0}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Minutes:</span>
            <span className="text-sm font-medium">
              {player.matchStats?.totalMinutes || 0}
            </span>
          </div>

          {/* Minutes by Position */}
          {getTotalMinutesByPosition().length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Minutes by Position:</span>
              {getTotalMinutesByPosition().map(({ position, minutes }) => (
                <div key={position} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground capitalize">{position}:</span>
                  <span>{minutes}m</span>
                </div>
              ))}
            </div>
          )}

          {/* Captain Games */}
          {player.matchStats?.captainGames > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Captain Games:</span>
              <span className="text-sm font-medium">
                {player.matchStats.captainGames}
              </span>
            </div>
          )}
          
          {/* Player of the Match */}
          {player.matchStats?.playerOfTheMatchCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">POTM:</span>
              <span className="text-sm font-medium">
                {player.matchStats.playerOfTheMatchCount}
              </span>
            </div>
          )}

          {inactive && player.leaveDate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Left:</span>
              <span className="text-sm font-medium">
                {new Date(player.leaveDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && !inactive && (
            <div className="border-t pt-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                {onManageParents && (
                  <Button variant="outline" size="sm" onClick={() => onManageParents(player)} className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Parents
                  </Button>
                )}
                {onManageAttributes && (
                  <Button variant="outline" size="sm" onClick={() => onManageAttributes(player)} className="text-xs">
                    Attributes
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

          {/* Inactive Player Actions */}
          {inactive && (
            <div className="flex flex-wrap gap-1 pt-2">
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
        </div>
      </CardContent>
    </Card>
  );
};
