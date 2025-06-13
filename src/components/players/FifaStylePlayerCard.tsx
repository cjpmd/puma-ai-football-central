
import React, { useState } from 'react';
import { Player, Team } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Camera, Crown, ArrowLeft, User, Calendar, Hash, Shirt, Award, Users, Brain, Target, MessageSquare, BarChart3, UserMinus, RefreshCw, Edit } from 'lucide-react';

interface FifaStylePlayerCardProps {
  player: Player;
  team?: Team;
  onEdit?: (player: Player) => void;
  onManageParents?: (player: Player) => void;
  onRemoveFromSquad?: (player: Player) => void;
  onUpdatePhoto?: (player: Player, file: File) => void;
  onSaveFunStats?: (player: Player, stats: Record<string, number>) => void;
  onSavePlayStyle?: (player: Player, playStyles: string[]) => void;
  onSaveCardDesign?: (player: Player, designId: string) => void;
  onManageAttributes?: (player: Player) => void;
  onManageObjectives?: (player: Player) => void;
  onManageComments?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
  onViewHistory?: (player: Player) => void;
  onTransferPlayer?: (player: Player) => void;
  onLeaveTeam?: (player: Player) => void;
}

type CardDesignImage = {
  name: string;
  bgImage: string;
  border: string;
  textColor: string;
  shadow: string;
};

type CardDesign = CardDesignImage;

const cardDesigns: Record<string, CardDesign> = {
  goldBallon: {
    name: "Gold Ballon d'Or",
    bgImage: "url('/lovable-uploads/03f7b9d6-8512-4609-a849-1a8b690399ea.png')",
    border: "border-yellow-400",
    textColor: "text-yellow-900",
    shadow: "shadow-yellow-500/50",
  },
  orangeStadium: {
    name: "Orange Stadium",
    bgImage: "url('/lovable-uploads/6cbbcb58-092a-4c48-adc4-12501ebc9a70.png')",
    border: "border-orange-400",
    textColor: "text-orange-900",
    shadow: "shadow-orange-500/50",
  },
  blueChampions: {
    name: "Blue Champions",
    bgImage: "url('/lovable-uploads/d7e37207-294b-4c2a-840b-2a55234ddb3b.png')",
    border: "border-blue-400",
    textColor: "text-blue-900",
    shadow: "shadow-blue-500/50",
  },
  pinkVortex: {
    name: "Pink Vortex",
    bgImage: "url('/lovable-uploads/84d0f9c8-d146-41ef-86a0-871af15c0bc1.png')",
    border: "border-pink-400",
    textColor: "text-pink-900",
    shadow: "shadow-pink-500/50",
  }
};

// Updated play styles with your preferred icons
const playStylesWithIcons = [
  { value: "finisher", label: "Finisher", icon: "🎯", category: "attacker" },
  { value: "clinical", label: "Clinical", icon: "✅", category: "attacker" },
  { value: "speedster", label: "Speedster", icon: "⚡", category: "attacker" },
  { value: "trickster", label: "Trickster", icon: "🔮", category: "attacker" },
  { value: "playmaker", label: "Playmaker", icon: "🎭", category: "midfielder" },
  { value: "engine", label: "Engine", icon: "⚙️", category: "midfielder" },
  { value: "maestro", label: "Maestro", icon: "🎩", category: "midfielder" },
  { value: "workhorse", label: "Workhorse", icon: "💪", category: "midfielder" },
  { value: "guardian", label: "Guardian", icon: "🛡️", category: "defender" },
  { value: "interceptor", label: "Interceptor", icon: "⚔️", category: "defender" },
  { value: "rock", label: "Rock", icon: "🗿", category: "defender" },
  { value: "sweeper", label: "Sweeper", icon: "🧹", category: "defender" },
  { value: "reflexes", label: "Reflexes", icon: "🥅", category: "goalkeeper" },
  { value: "commander", label: "Commander", icon: "👑", category: "goalkeeper" },
  { value: "wall", label: "Wall", icon: "🧱", category: "goalkeeper" }
];

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
  onLeaveTeam
}) => {
  const [flipped, setFlipped] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(player.cardDesignId || "goldBallon");
  const [funStats, setFunStats] = useState(player.funStats || {});
  
  // Safe parsing of playStyle field
  const parsePlayStyles = (playStyleData: string | string[] | undefined): string[] => {
    if (!playStyleData) return [];
    
    // If it's already an array, return it
    if (Array.isArray(playStyleData)) return playStyleData;
    
    // If it's a string, try to parse as JSON first
    if (typeof playStyleData === 'string') {
      try {
        const parsed = JSON.parse(playStyleData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If JSON parsing fails, treat as a single play style
        return [playStyleData];
      }
    }
    
    return [];
  };

  const [selectedPlayStyles, setSelectedPlayStyles] = useState<string[]>(
    parsePlayStyles(player.playStyle)
  );

  const currentDesign = cardDesigns[selectedDesign] || cardDesigns.goldBallon;

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get top 3 positions with minutes (excluding SUB)
  const getTopPositions = () => {
    const minutesByPosition = player.matchStats?.minutesByPosition || {};
    const filteredPositions = Object.entries(minutesByPosition)
      .filter(([position]) => position !== 'SUB')
      .map(([position, minutes]) => ({
        position,
        minutes: Number(minutes) || 0
      }))
      .filter(p => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 3);

    // Add appropriate number of plus signs
    return filteredPositions.map((pos, index) => ({
      ...pos,
      display: index === 0 ? `${pos.position}+++` : 
               index === 1 ? `${pos.position}++` : 
               `${pos.position}+`
    }));
  };

  // Check for missing critical information
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

  const updateStat = (key: string, value: string) => {
    const numValue = Math.min(99, Math.max(0, parseInt(value) || 0));
    const updatedStats = { ...funStats, [key]: numValue };
    setFunStats(updatedStats);
    
    // Save immediately when value changes
    if (onSaveFunStats) {
      onSaveFunStats(player, updatedStats);
    }
  };

  const togglePlayStyle = (styleValue: string) => {
    let newStyles;
    if (selectedPlayStyles.includes(styleValue)) {
      newStyles = selectedPlayStyles.filter(s => s !== styleValue);
    } else if (selectedPlayStyles.length < 3) {
      newStyles = [...selectedPlayStyles, styleValue];
    } else {
      return; // Max 3 styles
    }
    
    setSelectedPlayStyles(newStyles);
    if (onSavePlayStyle) {
      onSavePlayStyle(player, newStyles);
    }
  };

  const isGoalkeeper = player.type === 'goalkeeper';
  const funStatLabels = isGoalkeeper
    ? [
        { key: "DIV", label: "Diving" },
        { key: "HAN", label: "Handling" },
        { key: "KIC", label: "Kicking" },
        { key: "REF", label: "Reflexes" },
        { key: "SPE", label: "Speed" },
        { key: "POS", label: "Positioning" }
      ]
    : [
        { key: "PAC", label: "Pace" },
        { key: "SHO", label: "Shooting" },
        { key: "PAS", label: "Passing" },
        { key: "DRI", label: "Dribbling" },
        { key: "DEF", label: "Defending" },
        { key: "PHY", label: "Physical" }
      ];

  const age = calculateAge(player.dateOfBirth || '');
  const topPositions = getTopPositions();
  const missingInfoAlerts = getMissingInfoAlerts();
  const hasAlerts = missingInfoAlerts.length > 0;
  const isCaptain = player.matchStats?.captainGames > 0;
  const captainCount = player.matchStats?.captainGames || 0;
  const potmCount = player.matchStats?.playerOfTheMatchCount || 0;
  const displayName = player.kit_sizes?.nameOnShirt || player.name || 'No Name';

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUpdatePhoto) {
      onUpdatePhoto(player, file);
    }
  };

  const handleSaveDesign = (designId: string) => {
    setSelectedDesign(designId);
    if (onSaveCardDesign) {
      onSaveCardDesign(player, designId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlayStyleIcon = (styleValue: string) => {
    const style = playStylesWithIcons.find(s => s.value === styleValue);
    return style ? style.icon : "";
  };

  const cardStyle = { 
    backgroundImage: currentDesign.bgImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  if (flipped) {
    // Back of card - management view
    return (
      <div className="w-[300px] h-[450px] mx-auto">
        <div className="w-full h-full rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-xl overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Header with Back Button */}
            <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-800">
              <h2 className="text-lg font-bold text-white">Player Management</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFlipped(false)}
                className="w-8 h-8 p-0 bg-white/20 hover:bg-white/30 rounded-full text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Content - Compact layout */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {/* Player Actions - All 9 buttons in 3x3 grid */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">Player Actions</h3>
                
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onEdit && onEdit(player)}
                    title="Edit Player"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onManageParents && onManageParents(player)}
                    title="Manage Parents"
                  >
                    <Users className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onManageAttributes && onManageAttributes(player)}
                    title="Manage Attributes"
                  >
                    <Brain className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onManageObjectives && onManageObjectives(player)}
                    title="Manage Objectives"
                  >
                    <Target className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onManageComments && onManageComments(player)}
                    title="Manage Comments"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onViewStats && onViewStats(player)}
                    title="View Statistics"
                  >
                    <BarChart3 className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onViewHistory && onViewHistory(player)}
                    title="View History"
                  >
                    <Calendar className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                    onClick={() => onTransferPlayer && onTransferPlayer(player)}
                    title="Transfer Player"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 border-red-400/50 hover:bg-red-400/10 text-red-400 bg-transparent text-xs"
                    onClick={() => onLeaveTeam && onLeaveTeam(player)}
                    title="Leave Team"
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Play Style Selector */}
              <div className="border-t border-white/20 pt-3">
                <label className="text-sm font-medium mb-2 block text-white">Play Styles (Max 3)</label>
                <div className="grid grid-cols-5 gap-1 max-h-16 overflow-y-auto">
                  {playStylesWithIcons.map(style => (
                    <Button
                      key={style.value}
                      variant={selectedPlayStyles.includes(style.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlayStyle(style.value)}
                      disabled={!selectedPlayStyles.includes(style.value) && selectedPlayStyles.length >= 3}
                      className="text-sm p-1 h-6 w-6"
                      title={style.label}
                    >
                      {style.icon}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Selected: {selectedPlayStyles.length}/3
                </div>
              </div>

              {/* Fun Stats Editor */}
              <div>
                <label className="text-sm font-medium mb-2 block text-white">FIFA Stats</label>
                <div className="grid grid-cols-3 gap-1">
                  {funStatLabels.map(stat => (
                    <div key={stat.key} className="text-center">
                      <div className="text-xs mb-1 text-white">{stat.key}</div>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={funStats[stat.key] || ''}
                        onChange={(e) => updateStat(stat.key, e.target.value)}
                        className="w-full text-center h-6 bg-white/10 border-white/20 text-white text-xs"
                        placeholder="--"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Design Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block text-white">Card Design</label>
                <Select value={selectedDesign} onValueChange={handleSaveDesign}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white h-6">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(cardDesigns).map(([id, design]) => (
                      <SelectItem key={id} value={id}>
                        {design.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Front of card
  return (
    <div className="w-[300px] h-[450px] mx-auto">
      <div 
        className={`w-full h-full rounded-2xl ${currentDesign.border} border-4 ${currentDesign.shadow} shadow-xl overflow-hidden relative`}
        style={cardStyle}
      >
        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFlipped(true)}
          className="absolute top-3 right-3 w-8 h-8 p-0 bg-black/30 hover:bg-black/40 rounded-full z-20 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 text-white" />
        </Button>

        {/* Alerts */}
        {hasAlerts && (
          <div className="absolute top-3 left-3 flex gap-1 z-20">
            {missingInfoAlerts.slice(0, 2).map((alert, index) => {
              const IconComponent = alert.icon;
              return (
                <div key={index} title={alert.message} className="bg-orange-500 rounded-full p-1">
                  <IconComponent className="h-3 w-3 text-white" />
                </div>
              );
            })}
          </div>
        )}

        {/* Captain Badge with Count */}
        {isCaptain && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-yellow-500/90 rounded-full px-2 py-1">
            <Crown className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-bold">{captainCount}</span>
          </div>
        )}

        {/* POTM Badge with Count */}
        {potmCount > 0 && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-purple-500/90 rounded-full px-2 py-1">
            <Award className="h-4 w-4 text-white" />
            <span className="text-white text-xs font-bold">{potmCount}</span>
          </div>
        )}

        <div className="p-4 h-full flex flex-col relative z-10">
          {/* Position Badges (Left Side) - Only show if positions exist */}
          {topPositions.length > 0 && (
            <div className="absolute left-2 top-16 space-y-1">
              {topPositions.map((pos, idx) => (
                <div key={pos.position} className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                  {pos.display}
                </div>
              ))}
            </div>
          )}

          {/* Player Photo - Made larger */}
          <div className="relative mx-auto mb-6 mt-8">
            <Avatar className="h-32 w-32 border-3 border-white/70 shadow-lg">
              <AvatarImage src={player.photoUrl} alt={displayName} />
              <AvatarFallback className="text-2xl bg-white/30 text-white font-bold">
                {player.name ? getInitials(player.name) : 'PL'}
              </AvatarFallback>
            </Avatar>
            {onUpdatePhoto && (
              <label className="absolute -bottom-1 -right-1 bg-white/90 text-gray-800 rounded-full p-1 cursor-pointer hover:bg-white transition-colors shadow-lg">
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

          {/* Player Name - Lowered position */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white drop-shadow-lg truncate">
              {displayName}
            </h1>
          </div>

          {/* FIFA Stats - Lowered position */}
          <div className="flex justify-between items-center mb-6 px-2">
            {funStatLabels.map(stat => (
              <div key={stat.key} className="text-center flex-1">
                <div className="text-white text-xs font-bold mb-1 drop-shadow-md">{stat.key}</div>
                <div className="text-white text-lg font-bold drop-shadow-md">
                  {funStats[stat.key] || '--'}
                </div>
              </div>
            ))}
          </div>

          {/* Play Style Icons */}
          <div className="flex justify-center mb-4 gap-2">
            {selectedPlayStyles.map((style, index) => (
              <div key={index} className="text-2xl drop-shadow-lg">
                {getPlayStyleIcon(style)}
              </div>
            ))}
          </div>

          {/* Bottom Info - Enhanced styling for better visibility */}
          <div className="mt-auto">
            <div className="flex justify-between items-center text-sm font-bold">
              <span 
                className="text-gray-800 drop-shadow-md"
                style={{
                  textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'
                }}
              >
                #{player.squadNumber || 'XX'}
              </span>
              <span 
                className="text-gray-800 drop-shadow-md"
                style={{
                  textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'
                }}
              >
                Age {age}
              </span>
              <span 
                className="text-gray-800 drop-shadow-md"
                style={{
                  textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'
                }}
              >
                {isGoalkeeper ? 'GK' : 'OUTFIELD'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
