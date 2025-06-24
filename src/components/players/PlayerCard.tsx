import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Player } from '@/types';
import { Edit, Users, TrendingUp, TrendingDown, Minus, User, Calendar, Hash, Shirt, UserMinus, ArrowRightLeft, Trash2, RotateCcw, Settings, Crown, Trophy, BarChart3, Brain, Target, MessageSquare, History, Camera, Upload, RefreshCw } from 'lucide-react';
import { comprehensiveStatsRebuild } from '@/utils/comprehensiveStatsRebuild';
import { useQueryClient } from '@tanstack/react-query';

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
  onUpdatePhoto?: (player: Player, file: File) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onEdit,
  onManageParents,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
  onLeave,
  onTransfer,
  onResurrect,
  onDelete,
  onUpdatePhoto,
  inactive = false,
  showSubscription = true
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

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
    if (attributes.length === 0) return <Minus className="h-3 w-3 text-gray-400" />;
    
    const avgValue = attributes.reduce((sum, attr) => sum + attr.value, 0) / attributes.length;
    
    if (avgValue >= 7) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (avgValue <= 4) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    } else {
      return <Minus className="h-3 w-3 text-gray-600" />;
    }
  };

  // Check for missing critical information with specific icons
  const getMissingInfoAlerts = () => {
    const alerts = [];
    
    // Check if name is missing or only contains whitespace
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
      .slice(0, 2); // Show top 2 positions to save space
  };

  const isCaptain = player.matchStats?.captainGames > 0;
  const isPOTM = player.matchStats?.playerOfTheMatchCount > 0;
  const topPositions = getTotalMinutesByPosition();

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUpdatePhoto) {
      onUpdatePhoto(player, file);
    }
  };

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = player.kit_sizes?.nameOnShirt || player.name || 'No Name';

  const handleRebuildStats = async () => {
    try {
      await comprehensiveStatsRebuild();
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-players'] });
      queryClient.invalidateQueries({ queryKey: ['active-players'] });
      toast.success('All player statistics rebuilt from team selections!');
    } catch (error) {
      console.error('Error rebuilding stats:', error);
      toast.error('Failed to rebuild statistics');
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow h-[300px] flex flex-col ${inactive ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2 flex-shrink-0 p-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex gap-2 flex-1 min-w-0">
            {/* Player Photo */}
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={player.photoUrl} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {player.name ? getInitials(player.name) : 'PL'}
                </AvatarFallback>
              </Avatar>
              {!inactive && onUpdatePhoto && (
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-1 text-sm font-bold leading-tight">
                <span className="truncate text-xs">{displayName}</span>
                <span className="text-sm font-bold flex-shrink-0">#{player.squadNumber || 'No Number'}</span>
                {hasAlerts && !inactive && (
                  <div className="flex gap-1 flex-shrink-0">
                    {missingInfoAlerts.slice(0, 2).map((alert, index) => {
                      const IconComponent = alert.icon;
                      return (
                        <span key={index} title={alert.message}>
                          <IconComponent className="h-3 w-3 text-orange-500" />
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardTitle>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {player.type === 'goalkeeper' ? 'GK' : 'Outfield'} • Age {player.dateOfBirth ? new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear() : 0}
                </span>
                {!inactive && <div className={`w-1.5 h-1.5 rounded-full ${getAvailabilityColor(player.availability)}`} />}
                {getPerformanceIcon()}
              </div>
            </div>
          </div>

          {/* Settings Button */}
          <div className="flex gap-1 flex-shrink-0">
            {inactive ? (
              <>
                {onResurrect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResurrect(player)}
                    className="h-6 w-6 p-0"
                    title="Return to Squad"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(player)}
                    className="h-6 w-6 p-0 text-red-600"
                    title="Delete Player"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            ) : (
              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 absolute top-3 right-3"
                    title="Settings"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="grid gap-0.5">
                    {onEdit && (
                      <Button variant="ghost" size="sm" onClick={() => {onEdit(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <Edit className="h-3 w-3 mr-2" />
                        Edit Player
                      </Button>
                    )}
                    {onManageParents && (
                      <Button variant="ghost" size="sm" onClick={() => {onManageParents(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <Users className="h-3 w-3 mr-2" />
                        Manage Parents
                      </Button>
                    )}
                    {onManageAttributes && (
                      <Button variant="ghost" size="sm" onClick={() => {onManageAttributes(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <Brain className="h-3 w-3 mr-2" />
                        Manage Attributes
                      </Button>
                    )}
                    {onManageObjectives && (
                      <Button variant="ghost" size="sm" onClick={() => {onManageObjectives(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <Target className="h-3 w-3 mr-2" />
                        Manage Objectives
                      </Button>
                    )}
                    {onManageComments && (
                      <Button variant="ghost" size="sm" onClick={() => {onManageComments(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <MessageSquare className="h-3 w-3 mr-2" />
                        Manage Comments
                      </Button>
                    )}
                    {onViewStats && (
                      <Button variant="ghost" size="sm" onClick={() => {onViewStats(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <BarChart3 className="h-3 w-3 mr-2" />
                        View Statistics
                      </Button>
                    )}
                    {onViewHistory && (
                      <Button variant="ghost" size="sm" onClick={() => {onViewHistory(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <History className="h-3 w-3 mr-2" />
                        View History
                      </Button>
                    )}
                    {onTransfer && (
                      <Button variant="ghost" size="sm" onClick={() => {onTransfer(player); setShowSettings(false);}} className="justify-start text-xs h-7">
                        <ArrowRightLeft className="h-3 w-3 mr-2" />
                        Transfer Player
                      </Button>
                    )}
                    {onLeave && (
                      <Button variant="ghost" size="sm" onClick={() => {onLeave(player); setShowSettings(false);}} className="justify-start text-xs h-7 text-red-600">
                        <UserMinus className="h-3 w-3 mr-2" />
                        Leave Team
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {handleRebuildStats(); setShowSettings(false);}} 
                      className="justify-start text-xs h-7 text-orange-600"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Rebuild All Stats
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-2 pb-3 px-3">
        {/* Subscription Badge - Fixed Position */}
        <div className="h-4 flex items-center">
          {showSubscription && !inactive && (
            <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs px-1.5 py-0">
              {getSubscriptionLabel(player.subscriptionType || 'full_squad')}
            </Badge>
          )}
        </div>

        {/* Stats Grid - Fixed Position */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-lg font-bold">{player.matchStats?.totalGames || 0}</div>
            <div className="text-xs text-muted-foreground">Games</div>
          </div>
          <div>
            <div className="text-lg font-bold">{player.matchStats?.totalMinutes || 0}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </div>
        </div>

        {/* Captain and POTM badges - Fixed Height Area */}
        <div className="h-5 flex gap-2 justify-center">
          {isCaptain && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Crown className="h-3 w-3" />
              <span className="text-xs font-medium">{player.matchStats?.captainGames}</span>
            </div>
          )}
          {isPOTM && (
            <div className="flex items-center gap-1 text-yellow-600">
              <Trophy className="h-3 w-3" />
              <span className="text-xs font-medium">{player.matchStats?.playerOfTheMatchCount}</span>
            </div>
          )}
        </div>

        {/* Top Positions - Fixed Height Area */}
        <div className="h-8 text-center">
          {topPositions.length > 0 && (
            <>
              <div className="text-xs font-medium mb-0.5">Top Positions</div>
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
          <div className="text-xs text-muted-foreground text-center">
            Left: {new Date(player.leaveDate).toLocaleDateString()}
          </div>
        )}

        {/* Main Action Buttons - Fixed Position at Bottom */}
        <div className="mt-auto">
          {!inactive ? (
            <div className="flex gap-1.5">
              {onViewStats && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewStats(player)}
                  className="flex-1 text-xs h-7"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Stats
                </Button>
              )}
              {onManageAttributes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onManageAttributes(player)}
                  className="flex-1 text-xs h-7"
                >
                  <Brain className="h-3 w-3 mr-1" />
                  Attributes
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {onViewStats && (
                <Button variant="outline" size="sm" onClick={() => onViewStats(player)} className="text-xs h-7">
                  Stats
                </Button>
              )}
              {onViewHistory && (
                <Button variant="outline" size="sm" onClick={() => onViewHistory(player)} className="text-xs h-7">
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
