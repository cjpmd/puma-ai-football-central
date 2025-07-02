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
    background: `url('/lovable-uploads/03f7b9d6-8512-4609-a849-1a8b690399ea.png')`,
    borderGlow: 'shadow-lg shadow-yellow-400/50',
    name: 'Gold Rare'
  },
  silverRare: {
    className: 'border-2 border-gray-400', 
    background: `url('/lovable-uploads/0b482bd3-18fb-49dd-8a03-f68969572c7e.png')`,
    borderGlow: 'shadow-lg shadow-gray-400/50',
    name: 'Silver Rare'
  },
  bronzeRare: {
    className: 'border-2 border-amber-600',
    background: `url('/lovable-uploads/0e7b2d9e-64e2-46da-8a4f-01a3e2cd50df.png')`,
    borderGlow: 'shadow-lg shadow-amber-600/50',
    name: 'Bronze Rare'
  },
  purpleSpecial: {
    className: 'border-2 border-purple-400',
    background: `url('/lovable-uploads/52998c71-592a-493d-bab1-7a1a5726080e.png')`,
    borderGlow: 'shadow-lg shadow-purple-400/50',
    name: 'Purple Special'
  },
  galaxyGems: {
    className: 'border-2 border-blue-400',
    background: `url('/lovable-uploads/6cbbcb58-092a-4c48-adc4-12501ebc9a70.png')`,
    borderGlow: 'shadow-lg shadow-blue-400/50',
    name: 'Galaxy Gems'
  },
  iconicMoments: {
    className: 'border-2 border-pink-400',
    background: `url('/lovable-uploads/84d0f9c8-d146-41ef-86a0-871af15c0bc1.png')`,
    borderGlow: 'shadow-lg shadow-pink-400/50',
    name: 'Iconic Moments'
  },
  futureStars: {
    className: 'border-2 border-green-400',
    background: `url('/lovable-uploads/d7e37207-294b-4c2a-840b-2a55234ddb3b.png')`,
    borderGlow: 'shadow-lg shadow-green-400/50',
    name: 'Future Stars'
  },
  teamOfTheYear: {
    className: 'border-2 border-indigo-400',
    background: `url('/lovable-uploads/e312db4c-9834-4d19-8b74-abf4e871c7c1.png')`,
    borderGlow: 'shadow-lg shadow-indigo-400/50',
    name: 'Team of the Year'
  },
  heroCard: {
    className: 'border-2 border-orange-400',
    background: `url('/lovable-uploads/f10817a5-248b-4981-8539-e72f55ca861a.png')`,
    borderGlow: 'shadow-lg shadow-orange-400/50',
    name: 'Hero Card'
  },
  legendCard: {
    className: 'border-2 border-red-400',
    background: `url('/lovable-uploads/f930e1ff-b50a-437b-94f8-a51a79bf9fac.png')`,
    borderGlow: 'shadow-lg shadow-red-400/50',
    name: 'Legend Card'
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
        className="relative w-72 h-[450px] mx-auto cursor-pointer transform transition-all duration-300 hover:scale-105 rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          border: '2px solid rgba(148, 163, 184, 0.3)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onFlip(); }}
            className="text-white hover:bg-white/10 bg-black/20"
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
            <h3 className="text-white font-bold mb-3 text-lg">Player Actions</h3>
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
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); action.action?.(); }}
                  className="h-12 flex flex-col items-center justify-center text-xs bg-slate-700 text-white border border-slate-600 hover:bg-slate-600"
                >
                  <action.icon className="h-4 w-4 mb-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Photo Management */}
          <div>
            <h3 className="text-white font-bold mb-3 text-lg">Photo Management</h3>
            <div className="space-y-2">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUpdatePhoto) {
                      onUpdatePhoto(player, file);
                    }
                  }}
                  className="hidden"
                />
                <Button
                  size="sm"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 border-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </label>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDeletePhoto?.(player); }}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Photo
              </Button>
            </div>
          </div>

          {/* Play Styles */}
          <div>
            <h3 className="text-white font-bold mb-3 text-lg">Play Styles (Max 3)</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(playStyleIcons).map(([style, icon]) => (
                <Button
                  key={style}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handlePlayStyleToggle(style); }}
                  className={`h-12 flex flex-col items-center justify-center text-xs ${
                    selectedPlayStyles.includes(style) 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-slate-700 text-white border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <span className="text-lg mb-1">{icon}</span>
                  {style}
                </Button>
              ))}
            </div>
            <p className="text-slate-300 text-xs mt-2">Selected: {selectedPlayStyles.length}/3</p>
          </div>

          {/* FIFA Stats */}
          <div>
            <h3 className="text-white font-bold mb-3 text-lg">FIFA Stats</h3>
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
                  <label className="text-slate-300 text-xs">{stat.label}</label>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={tempStats[stat.key] || 50}
                    onChange={(e) => setTempStats({...tempStats, [stat.key]: parseInt(e.target.value) || 50})}
                    className="mt-1 text-center bg-slate-700 border-slate-600 text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
            <Button
              onClick={(e) => { e.stopPropagation(); handleSaveStats(); }}
              size="sm"
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
            >
              Save Stats
            </Button>
          </div>

          {/* Card Design */}
          <div>
            <h3 className="text-white font-bold mb-3 text-lg">Card Design</h3>
            <Select value={selectedCardDesign} onValueChange={handleCardDesignChange}>
              <SelectTrigger onClick={(e) => e.stopPropagation()} className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white z-50">
                {Object.entries(designs).map(([key, design]) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-slate-600 focus:bg-slate-600">{design.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Front side - FIFA-style card matching reference image exactly
  return (
    <div 
      className="relative w-64 h-96 mx-auto cursor-pointer transform transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden"
      onClick={onFlip}
      style={{
        background: currentDesign.background,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: `0 0 15px ${currentDesign.className.includes('yellow') ? 'rgba(251, 191, 36, 0.6)' : 
                                  currentDesign.className.includes('gray') ? 'rgba(156, 163, 175, 0.6)' :
                                  currentDesign.className.includes('amber') ? 'rgba(217, 119, 6, 0.6)' :
                                  currentDesign.className.includes('purple') ? 'rgba(192, 132, 252, 0.6)' :
                                  currentDesign.className.includes('blue') ? 'rgba(96, 165, 250, 0.6)' :
                                  currentDesign.className.includes('pink') ? 'rgba(244, 114, 182, 0.6)' :
                                  currentDesign.className.includes('green') ? 'rgba(34, 197, 94, 0.6)' :
                                  currentDesign.className.includes('indigo') ? 'rgba(129, 140, 248, 0.6)' :
                                  currentDesign.className.includes('orange') ? 'rgba(251, 146, 60, 0.6)' :
                                  'rgba(239, 68, 68, 0.6)'}`
      }}
    >
      {/* Top left - Overall rating and position */}
      <div className="absolute top-2 left-2 z-20">
        <div className="bg-black/70 rounded px-2 py-1 text-center min-w-[40px]">
          <div className="text-lg font-black text-white leading-none">{overall}</div>
          <div className="text-[8px] font-bold text-white/90">{positionAbbr}</div>
        </div>
      </div>

      {/* Top right corner icons */}
      <div className="absolute top-2 right-2 z-20 flex space-x-1">
        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
          🥇
        </div>
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
          👑
        </div>
        <div className="w-6 h-6 bg-gray-400/80 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white/80 rounded-sm"></div>
        </div>
      </div>

      {/* Left side position indicators */}
      <div className="absolute top-12 left-2 z-20 space-y-0.5">
        <div className="bg-black/70 text-white text-[8px] font-bold px-1 py-0.5 rounded">
          CB+++
        </div>
        <div className="bg-black/70 text-white text-[8px] font-bold px-1 py-0.5 rounded">
          Midfielder Right
        </div>
        <div className="bg-black/70 text-white text-[8px] font-bold px-1 py-0.5 rounded">
          LB+
        </div>
      </div>

      {/* Large circular player image */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10">
        <div className="relative w-40 h-40">
          <div 
            className="w-full h-full rounded-full overflow-hidden border-2 border-white/20"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.3) 100%)'
            }}
          >
            <img 
              src={player.photo_url || 'https://via.placeholder.com/160'} 
              alt={player.name} 
              className="w-full h-full object-cover" 
            />
            {/* Subtle circular fade overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent 60% to-black/20" />
          </div>
          {/* Camera icon */}
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-white/70 rounded-full flex items-center justify-center">
            <Camera className="w-2.5 h-2.5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Player name */}
      <div className="absolute bottom-20 left-2 right-2 text-center z-20">
        <h3 className="text-white font-black text-lg leading-tight drop-shadow-md">
          {player.name}
        </h3>
      </div>

      {/* Stats grid */}
      <div className="absolute bottom-8 left-2 right-2 z-20">
        <div className="grid grid-cols-6 gap-1 text-center mb-2">
          {[
            { label: 'PAC', value: playerStats.pace || 50 },
            { label: 'SHO', value: playerStats.shooting || 50 },
            { label: 'PAS', value: playerStats.passing || 50 },
            { label: 'DRI', value: playerStats.dribbling || 50 },
            { label: 'DEF', value: playerStats.defending || 50 },
            { label: 'PHY', value: playerStats.physical || 50 }
          ].map((stat, index) => (
            <div key={index}>
              <div className="text-white font-black text-sm leading-none">{stat.value}</div>
              <div className="text-white/90 text-[8px] font-bold">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Play style icons */}
        <div className="flex justify-center space-x-2 mb-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">⚡</span>
          </div>
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🎯</span>
          </div>
        </div>
      </div>

      {/* Bottom info - exact layout from reference */}
      <div className="absolute bottom-1 left-2 right-2 flex justify-between items-center z-20">
        <span className="text-purple-300 font-bold text-sm">#{player.squad_number || 23}</span>
        <span className="text-purple-300 font-bold text-sm">Age {age}</span>
        <span className="text-purple-300 font-bold text-sm">{player.type?.toUpperCase() || 'OUTFIELD'}</span>
      </div>
    </div>
  );
};