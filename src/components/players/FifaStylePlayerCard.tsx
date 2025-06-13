
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Player, Team } from '@/types';
import { 
  User, 
  Users, 
  Camera, 
  Palette, 
  MoreHorizontal,
  Brain,
  Target,
  MessageSquare,
  BarChart3,
  Calendar,
  ArrowLeftRight,
  LogOut,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FifaStylePlayerCardProps {
  player: Player;
  team?: Team;
  onEdit: (player: Player) => void;
  onManageParents: (player: Player) => void;
  onRemoveFromSquad: (player: Player) => void;
  onUpdatePhoto: (player: Player, file: File) => void;
  onSaveFunStats: (player: Player, stats: Record<string, number>) => void;
  onSavePlayStyle: (player: Player, playStyles: string[]) => void;
  onSaveCardDesign: (player: Player, designId: string) => void;
  onManageAttributes?: (player: Player) => void;
  onManageObjectives?: (player: Player) => void;
  onManageComments?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
  onViewHistory?: (player: Player) => void;
  onTransferPlayer?: (player: Player) => void;
  onLeaveTeam?: (player: Player) => void;
}

export const FifaStylePlayerCard: React.FC<FifaStylePlayerCardProps> = ({
  player,
  team,
  onEdit,
  onManageParents,
  onRemoveFromSquad,
  onUpdatePhoto,
  onSaveFunStats,
  onSavePlayStyle,
  onSaveCardDesign,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
  onTransferPlayer,
  onLeaveTeam,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleClose = () => {
    setIsFlipped(false);
  };

  // Get overall rating (average of all attributes)
  const getOverallRating = () => {
    if (!player.attributes || player.attributes.length === 0) return 75;
    const total = player.attributes.reduce((sum: number, attr: any) => sum + (attr.value || 0), 0);
    return Math.round(total / player.attributes.length);
  };

  // Get play styles from player data
  const getPlayStyles = () => {
    if (!player.playStyle) return [];
    try {
      return JSON.parse(player.playStyle);
    } catch {
      return [];
    }
  };

  // Get main position
  const getMainPosition = () => {
    if (!player.matchStats?.minutesByPosition) return player.type === 'goalkeeper' ? 'GK' : 'MID';
    
    const positions = Object.entries(player.matchStats.minutesByPosition);
    if (positions.length === 0) return player.type === 'goalkeeper' ? 'GK' : 'MID';
    
    positions.sort((a, b) => (b[1] as number) - (a[1] as number));
    return positions[0][0];
  };

  const cardDesign = player.cardDesignId || 'goldRare';

  return (
    <div className="relative w-64 h-96 fifa-card-container">
      <div className={`relative w-full h-full transition-transform duration-700 fifa-card-inner ${isFlipped ? 'fifa-card-flipped' : ''}`}>
        
        {/* Front of Card */}
        <div className="absolute inset-0 w-full h-full fifa-card-face fifa-card-front">
          <Card className="w-full h-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 border-2 border-amber-700 shadow-2xl overflow-hidden">
            {/* Close Button - Front */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2 z-20 h-6 w-6 p-0 bg-black/20 hover:bg-black/40 text-white rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>

            {/* Card Header with Rating and Position */}
            <div className="flex justify-between items-start p-3">
              <div className="text-left">
                <div className="text-2xl font-bold text-amber-900">{getOverallRating()}</div>
                <div className="text-sm font-semibold text-amber-800">{getMainPosition()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-800">#{player.squadNumber}</div>
                <div className="text-xs text-amber-800">{team?.name}</div>
              </div>
            </div>

            {/* Player Image Area */}
            <div className="relative h-48 flex items-center justify-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-16 w-16 text-gray-500" />
              </div>
            </div>

            {/* Player Info Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4">
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold truncate">{player.name}</h3>
                <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                  {player.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training'}
                </Badge>
              </div>

              {/* FIFA Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div className="text-center">
                  <div className="font-semibold">Games</div>
                  <div>{player.matchStats?.totalGames || 0}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Minutes</div>
                  <div>{player.matchStats?.totalMinutes || 0}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">Captain</div>
                  <div>{player.matchStats?.captainGames || 0}</div>
                </div>
              </div>

              {/* Play Styles */}
              <div className="text-center">
                <div className="text-xs font-semibold mb-1">Play Styles</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {getPlayStyles().slice(0, 2).map((style: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-white/20 border-white/30 text-white">
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center mt-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFlip}
                  className="text-white hover:bg-white/20 text-xs"
                >
                  Actions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(player)}
                  className="text-white hover:bg-white/20 text-xs"
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Back of Card */}
        <div className="absolute inset-0 w-full h-full fifa-card-face fifa-card-back">
          <Card className="w-full h-full bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 border-2 border-slate-500 shadow-2xl text-white">
            {/* Close Button - Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2 z-20 h-6 w-6 p-0 bg-black/20 hover:bg-black/40 text-white rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>

            <div className="p-4 h-full flex flex-col">
              <h3 className="text-lg font-bold text-center mb-4">{player.name} - Actions</h3>
              
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onManageParents(player)}
                  className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                >
                  <Users className="h-4 w-4 mb-1" />
                  <span className="text-xs">Parents</span>
                </Button>

                {onManageAttributes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageAttributes(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <Brain className="h-4 w-4 mb-1" />
                    <span className="text-xs">Attributes</span>
                  </Button>
                )}

                {onManageObjectives && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageObjectives(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <Target className="h-4 w-4 mb-1" />
                    <span className="text-xs">Objectives</span>
                  </Button>
                )}

                {onManageComments && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageComments(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <MessageSquare className="h-4 w-4 mb-1" />
                    <span className="text-xs">Comments</span>
                  </Button>
                )}

                {onViewStats && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewStats(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <BarChart3 className="h-4 w-4 mb-1" />
                    <span className="text-xs">Stats</span>
                  </Button>
                )}

                {onViewHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewHistory(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <Calendar className="h-4 w-4 mb-1" />
                    <span className="text-xs">History</span>
                  </Button>
                )}

                {onTransferPlayer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTransferPlayer(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <ArrowLeftRight className="h-4 w-4 mb-1" />
                    <span className="text-xs">Transfer</span>
                  </Button>
                )}

                {onLeaveTeam && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLeaveTeam(player)}
                    className="flex flex-col items-center justify-center h-16 text-white hover:bg-white/20"
                  >
                    <LogOut className="h-4 w-4 mb-1" />
                    <span className="text-xs">Leave</span>
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleFlip}
                className="mt-4 border-white/30 text-white hover:bg-white/20"
              >
                Back to Card
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
