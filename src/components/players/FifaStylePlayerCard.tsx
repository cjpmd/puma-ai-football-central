import React, { useState } from 'react';
import { MoreVertical, Pencil, Camera, Trash2, Users, Brain, Target, MessageSquare, BarChart3, Calendar, RefreshCw, UserMinus, ArrowLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FifaStylePlayerCardProps {
  player: any;
  showBackside?: boolean;
  onFlip: () => void;
  isEditable?: boolean;
  onEdit?: () => void;
  onManageParents?: (player: any) => void;
  onRemoveFromSquad?: (player: any) => void;
  onUpdatePhoto?: (player: any, file: File) => void;
  onDeletePhoto?: (player: any) => void;
  onSaveFunStats?: (player: any, stats: Record<string, number>) => void;
  onSavePlayStyle?: (player: any, playStyles: string[]) => void;
  onSaveCardDesign?: (player: any, designId: string) => void;
  onManageAttributes?: (player: any) => void;
  onManageObjectives?: (player: any) => void;
  onManageComments?: (player: any) => void;
  onViewStats?: (player: any) => void;
  onViewHistory?: (player: any) => void;
  onTransferPlayer?: (player: any) => void;
  onLeaveTeam?: (player: any) => void;
}

const calculateOverall = (stats: any) => {
  if (!stats) return 50;
  const { pace, shooting, passing, dribbling, defending, physical } = stats;
  const total = (pace || 50) + (shooting || 50) + (passing || 50) + (dribbling || 50) + (defending || 50) + (physical || 50);
  return Math.round(total / 6);
};

const designs = {
  goldRare: {
    className: 'border-2 border-yellow-400',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #92400e 75%, #451a03 100%)',
    borderGlow: 'shadow-lg shadow-yellow-400/50',
    name: 'Gold Rare'
  },
  silverRare: {
    className: 'border-2 border-gray-400', 
    background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 25%, #6b7280 50%, #374151 75%, #111827 100%)',
    borderGlow: 'shadow-lg shadow-gray-400/50',
    name: 'Silver Rare'
  },
  bronzeRare: {
    className: 'border-2 border-amber-600',
    background: 'linear-gradient(135deg, #d97706 0%, #92400e 25%, #451a03 50%, #1c1917 75%, #0c0a09 100%)',
    borderGlow: 'shadow-lg shadow-amber-600/50',
    name: 'Bronze Rare'
  },
  purpleSpecial: {
    className: 'border-2 border-purple-400',
    background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 25%, #9333ea 50%, #7c3aed 75%, #5b21b6 100%)',
    borderGlow: 'shadow-lg shadow-purple-400/50',
    name: 'Purple Special'
  },
  galaxyGems: {
    className: 'border-2 border-blue-400',
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 25%, #2563eb 50%, #1d4ed8 75%, #1e3a8a 100%)',
    borderGlow: 'shadow-lg shadow-blue-400/50',
    name: 'Galaxy Gems'
  }
};

const playStyleIcons = {
  pace: '⚡',
  technical: '⚙️',
  physical: '💪',
  defensive: '🛡️',
  creative: '🎨',
  leadership: '👑',
  finishing: '🎯',
  crossing: '🔄',
  versatile: '🔧'
};

export const FifaStylePlayerCard: React.FC<FifaStylePlayerCardProps> = ({ 
  player, 
  showBackside = false, 
  onFlip,
  isEditable = false,
  onEdit,
  onManageParents,
  onRemoveFromSquad,
  onUpdatePhoto,
  onDeletePhoto,
  onSaveFunStats,
  onSavePlayStyle,
  onSaveCardDesign,
  onManageAttributes,
  onManageObjectives,
  onManageComments,
  onViewStats,
  onViewHistory,
  onTransferPlayer,
  onLeaveTeam
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tempStats, setTempStats] = useState(player.fun_stats || {});
  const [selectedPlayStyles, setSelectedPlayStyles] = useState<string[]>(
    typeof player.play_style === 'string' ? JSON.parse(player.play_style || '[]') : []
  );
  const [selectedCardDesign, setSelectedCardDesign] = useState(player.card_design_id || 'goldRare');

  const currentDesign = designs[player.card_design_id as keyof typeof designs] || designs.goldRare;
  const playerStats = player.fun_stats as any || {};
  const overall = calculateOverall(playerStats);
  
  const getPositionAbbr = (playStyle: string) => {
    const positions: { [key: string]: string } = {
      'goalkeeper': 'GK',
      'defender': 'CB++',
      'midfielder': 'CM++', 
      'forward': 'ST++',
      'winger': 'LW++',
      'striker': 'ST++',
      'Balanced': 'CM++'
    };
    return positions[playStyle] || 'CM++';
  };

  const positionAbbr = getPositionAbbr(player.play_style || 'Balanced');
  const age = player.date_of_birth ? new Date().getFullYear() - new Date(player.date_of_birth).getFullYear() : 0;

  const handleSaveStats = () => {
    if (onSaveFunStats) {
      onSaveFunStats(player, tempStats);
    }
  };

  const handlePlayStyleToggle = (style: string) => {
    const newStyles = selectedPlayStyles.includes(style)
      ? selectedPlayStyles.filter(s => s !== style)
      : selectedPlayStyles.length < 3 
        ? [...selectedPlayStyles, style] 
        : selectedPlayStyles;
    
    setSelectedPlayStyles(newStyles);
    if (onSavePlayStyle) {
      onSavePlayStyle(player, newStyles);
    }
  };

  const handleCardDesignChange = (designId: string) => {
    setSelectedCardDesign(designId);
    if (onSaveCardDesign) {
      onSaveCardDesign(player, designId);
    }
  };

  if (showBackside) {
    return (
      <div 
        className={`relative w-72 h-[450px] mx-auto cursor-pointer transform transition-all duration-300 hover:scale-105 ${currentDesign.className} ${currentDesign.borderGlow} rounded-xl overflow-hidden bg-slate-800`}
      >
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onFlip(); }}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Player Management
          </Button>
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white/40 rounded-sm"></div>
          </div>
        </div>

        <div className="p-6 pt-16 space-y-4 h-full overflow-y-auto">
          {/* Player Actions */}
          <div>
            <h3 className="text-white font-bold mb-3">Player Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Pencil, label: 'Edit', action: onEdit },
                { icon: Users, label: 'Parents', action: () => onManageParents?.(player) },
                { icon: Calendar, label: 'History', action: () => onViewHistory?.(player) },
                { icon: Target, label: 'Objectives', action: () => onManageObjectives?.(player) },
                { icon: MessageSquare, label: 'Comments', action: () => onManageComments?.(player) },
                { icon: BarChart3, label: 'Stats', action: () => onViewStats?.(player) },
                { icon: RefreshCw, label: 'Transfer', action: () => onTransferPlayer?.(player) },
                { icon: UserMinus, label: 'Leave', action: () => onLeaveTeam?.(player) }
              ].map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); action.action?.(); }}
                  className="h-12 flex flex-col items-center justify-center text-xs text-white border-white/30 hover:bg-white/20"
                >
                  <action.icon className="h-4 w-4 mb-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Photo Management */}
          <div>
            <h3 className="text-white font-bold mb-3">Photo Management</h3>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDeletePhoto?.(player); }}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Photo
            </Button>
          </div>

          {/* Play Styles */}
          <div>
            <h3 className="text-white font-bold mb-3">Play Styles (Max 3)</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(playStyleIcons).map(([style, icon]) => (
                <Button
                  key={style}
                  variant={selectedPlayStyles.includes(style) ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handlePlayStyleToggle(style); }}
                  className="h-12 flex flex-col items-center justify-center text-xs"
                >
                  <span className="text-lg mb-1">{icon}</span>
                  {style}
                </Button>
              ))}
            </div>
            <p className="text-white/70 text-xs mt-2">Selected: {selectedPlayStyles.length}/3</p>
          </div>

          {/* FIFA Stats */}
          <div>
            <h3 className="text-white font-bold mb-3">FIFA Stats</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'PAC', key: 'pace' },
                { label: 'SHO', key: 'shooting' },
                { label: 'PAS', key: 'passing' },
                { label: 'DRI', key: 'dribbling' },
                { label: 'DEF', key: 'defending' },
                { label: 'PHY', key: 'physical' }
              ].map((stat) => (
                <div key={stat.key} className="text-center">
                  <label className="text-white/70 text-xs">{stat.label}</label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={tempStats[stat.key] || 50}
                    onChange={(e) => setTempStats({...tempStats, [stat.key]: parseInt(e.target.value) || 50})}
                    className="mt-1 text-center"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSaveStats(); }}
              size="sm"
              className="w-full mt-2"
            >
              Save Stats
            </Button>
          </div>

          {/* Card Design */}
          <div>
            <h3 className="text-white font-bold mb-3">Card Design</h3>
            <Select value={selectedCardDesign} onValueChange={handleCardDesignChange}>
              <SelectTrigger onClick={(e) => e.stopPropagation()} className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {Object.entries(designs).map(([key, design]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-slate-600">{design.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-72 h-[450px] mx-auto cursor-pointer transform transition-all duration-300 hover:scale-105 ${currentDesign.className} ${currentDesign.borderGlow} rounded-xl overflow-hidden`}
      onClick={onFlip}
      style={{
        background: currentDesign.background,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Card Background Texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20"></div>
      
      {/* Card Header - Overall Rating and Position */}
      <div className="absolute top-4 left-4 flex flex-col items-center z-10">
        <div className="bg-black/80 text-white rounded-lg px-2 py-1 text-center">
          <div className="text-2xl font-bold leading-none">{overall}</div>
          <div className="text-xs font-semibold">{positionAbbr}</div>
        </div>
      </div>

      {/* Settings Icon */}
      <div className="absolute top-4 right-4 z-10">
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-white/40 rounded-sm"></div>
        </div>
      </div>

      {/* Player Image */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 z-10">
        <img 
          src={player.photo_url || 'https://via.placeholder.com/150'} 
          alt={player.name} 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Player Name */}
      <div className="absolute top-56 left-4 right-4 text-center z-10">
        <h3 className="text-white font-bold text-xl drop-shadow-lg">{player.name}</h3>
      </div>

      {/* Player Stats */}
      <div className="absolute bottom-16 left-4 right-4 z-10">
        <div className="grid grid-cols-6 gap-1 bg-black/60 rounded-lg p-3">
          {[
            { label: 'PAC', value: playerStats.pace || 50 },
            { label: 'SHO', value: playerStats.shooting || 50 },
            { label: 'PAS', value: playerStats.passing || 50 },
            { label: 'DRI', value: playerStats.dribbling || 50 },
            { label: 'DEF', value: playerStats.defending || 50 },
            { label: 'PHY', value: playerStats.physical || 50 }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-white font-bold text-lg">{stat.value}</div>
              <div className="text-white/80 text-xs font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Footer */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white/70 text-sm z-10">
        <span>#{player.squad_number || 0}</span>
        <span>Age {age}</span>
        <span>{player.type === 'goalkeeper' ? 'GOALKEEPER' : 'OUTFIELD'}</span>
      </div>
    </div>
  );
};