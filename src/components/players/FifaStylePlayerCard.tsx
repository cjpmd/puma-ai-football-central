import React, { useState } from 'react';
import { Player, Team } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Camera, Crown, ArrowLeft, User, Calendar, Hash, Shirt } from 'lucide-react';

interface FifaStylePlayerCardProps {
  player: Player;
  team?: Team;
  onEdit?: (player: Player) => void;
  onManageParents?: (player: Player) => void;
  onSetCaptain?: (player: Player) => void;
  onRemoveFromSquad?: (player: Player) => void;
  onUpdatePhoto?: (player: Player, file: File) => void;
  onSaveFunStats?: (player: Player, stats: Record<string, number>) => void;
  onSavePlayStyle?: (player: Player, playStyle: string) => void;
  onSaveCardDesign?: (player: Player, designId: string) => void;
}

type CardDesignGradient = {
  name: string;
  bgGradient: string;
  border: string;
  textColor: string;
  shadow: string;
};

type CardDesignImage = {
  name: string;
  bgImage: string;
  border: string;
  textColor: string;
  shadow: string;
};

type CardDesign = CardDesignGradient | CardDesignImage;

const cardDesigns: Record<string, CardDesign> = {
  goldRare: {
    name: "Gold Rare",
    bgGradient: "from-yellow-400 via-amber-500 to-yellow-600",
    border: "border-yellow-400",
    textColor: "text-yellow-900",
    shadow: "shadow-yellow-500/50",
  },
  silverCommon: {
    name: "Silver Common",
    bgGradient: "from-gray-300 via-gray-400 to-gray-500",
    border: "border-gray-400",
    textColor: "text-gray-900",
    shadow: "shadow-gray-500/50",
  },
  bronze: {
    name: "Bronze",
    bgGradient: "from-amber-600 via-orange-700 to-amber-800",
    border: "border-amber-600",
    textColor: "text-amber-100",
    shadow: "shadow-amber-600/50",
  },
  special: {
    name: "Special",
    bgImage: "url('/lovable-uploads/e312db4c-9834-4d19-8b74-abf4e871c7c1.png')",
    border: "border-purple-400",
    textColor: "text-white",
    shadow: "shadow-purple-500/50",
  }
};

const playStylesWithIcons = [
  { value: "Aerial", label: "Aerial", icon: "⚡" },
  { value: "Rapid", label: "Rapid", icon: "🏃" },
  { value: "Technical", label: "Technical", icon: "🎯" },
  { value: "Trickster", label: "Trickster", icon: "✨" },
  { value: "Finesse Shot", label: "Finesse Shot", icon: "🎨" },
  { value: "Power Shot", label: "Power Shot", icon: "💥" },
  { value: "Intercept", label: "Intercept", icon: "🛡️" },
  { value: "Pace Merchant", label: "Pace Merchant", icon: "⚡" },
  { value: "Playmaker", label: "Playmaker", icon: "🎪" },
  { value: "Target Man", label: "Target Man", icon: "🎯" },
  { value: "Poacher", label: "Poacher", icon: "🦅" },
  { value: "Defensive", label: "Defensive", icon: "🛡️" },
  { value: "Box-to-Box", label: "Box-to-Box", icon: "🔄" },
  { value: "Press Proven", label: "Press Proven", icon: "💪" },
  { value: "First Touch", label: "First Touch", icon: "👟" },
  { value: "Flair", label: "Flair", icon: "🌟" },
  { value: "Block", label: "Block", icon: "🚫" },
  { value: "Bruiser", label: "Bruiser", icon: "💀" },
  { value: "Jockey", label: "Jockey", icon: "🏇" },
  { value: "Slide Tackle", label: "Slide Tackle", icon: "⚔️" },
  { value: "Anticipate", label: "Anticipate", icon: "👁️" },
  { value: "Acrobatic", label: "Acrobatic", icon: "🤸" },
  { value: "Trivela", label: "Trivela", icon: "🌀" },
  { value: "Relentless", label: "Relentless", icon: "🔥" },
  { value: "Quick Step", label: "Quick Step", icon: "👟" },
  { value: "Long Throw", label: "Long Throw", icon: "🏹" },
  { value: "Far Throw", label: "Far Throw", icon: "🎯" },
  { value: "Footwork", label: "Footwork", icon: "👣" },
  { value: "Cross Claimer", label: "Cross Claimer", icon: "🙌" },
  { value: "Rush Out", label: "Rush Out", icon: "🏃" },
  { value: "Far Reach", label: "Far Reach", icon: "🤲" },
  { value: "Dead Ball", label: "Dead Ball", icon: "⚽" },
  { value: "Chip Shot", label: "Chip Shot", icon: "🎾" },
  { value: "Power Header", label: "Power Header", icon: "💥" },
  { value: "Low Driven Shot", label: "Low Driven Shot", icon: "⬇️" },
  { value: "Pinged Pass", label: "Pinged Pass", icon: "📍" },
  { value: "Incisive Pass", label: "Incisive Pass", icon: "🗡️" },
  { value: "Long Ball Pass", label: "Long Ball Pass", icon: "🏈" },
  { value: "Tiki Taka", label: "Tiki Taka", icon: "🔄" },
  { value: "Whipped Pass", label: "Whipped Pass", icon: "🌪️" }
];

export const FifaStylePlayerCard: React.FC<FifaStylePlayerCardProps> = ({
  player,
  team,
  onEdit,
  onManageParents,
  onSetCaptain,
  onRemoveFromSquad,
  onUpdatePhoto,
  onSaveFunStats,
  onSavePlayStyle,
  onSaveCardDesign
}) => {
  const [flipped, setFlipped] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(player.cardDesignId || "special");
  const [funStats, setFunStats] = useState(player.funStats || {});
  const [playStyle, setPlayStyle] = useState(player.playStyle || "");

  const currentDesign = cardDesigns[selectedDesign] || cardDesigns.special;

  // Type guard functions
  const hasBackgroundImage = (design: CardDesign): design is CardDesignImage => {
    return 'bgImage' in design;
  };

  const hasBackgroundGradient = (design: CardDesign): design is CardDesignGradient => {
    return 'bgGradient' in design;
  };

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

  // Get top 3 positions with minutes
  const getTopPositions = () => {
    const minutesByPosition = player.matchStats?.minutesByPosition || {};
    return Object.entries(minutesByPosition)
      .map(([position, minutes]) => ({
        position,
        minutes: Number(minutes) || 0
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 3);
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

  const handleSavePlayStyle = (style: string) => {
    setPlayStyle(style);
    if (onSavePlayStyle) {
      onSavePlayStyle(player, style);
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

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case 'full_squad': return 'Full Squad';
      case 'training': return 'Training';
      case 'trialist': return 'Trialist';
      default: return type;
    }
  };

  const getPlayStyleIcon = (styleValue: string) => {
    const style = playStylesWithIcons.find(s => s.value === styleValue);
    return style ? style.icon : "";
  };

  const cardStyle = hasBackgroundImage(currentDesign) 
    ? { 
        backgroundImage: currentDesign.bgImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {};

  return (
    <div className="w-[300px] h-[450px] perspective-1000 mx-auto">
      <div
        className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of Card */}
        <div 
          className={`absolute w-full h-full backface-hidden rounded-2xl ${
            hasBackgroundImage(currentDesign) ? '' : `bg-gradient-to-br ${currentDesign.bgGradient}`
          } ${currentDesign.border} border-4 ${currentDesign.shadow} shadow-xl overflow-hidden`}
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

          {/* Captain Badge */}
          {isCaptain && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20">
              <Crown className="h-6 w-6 text-yellow-300 drop-shadow-lg" />
            </div>
          )}

          <div className={`p-4 h-full flex flex-col ${currentDesign.textColor} relative z-10`}>
            {/* Position Badges (Left Side) */}
            <div className="absolute left-2 top-16 space-y-2">
              {topPositions.slice(0, 3).map((pos, idx) => (
                <div key={pos.position} className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                  {pos.position}
                  <div className="text-[10px] opacity-90">++</div>
                </div>
              ))}
            </div>

            {/* Position Icons (Left Side Below Badges) */}
            <div className="absolute left-2 top-48 space-y-2">
              <div className="bg-pink-500 text-white p-2 rounded-md shadow-lg">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="text-xs">⚽</div>
                </div>
              </div>
              <div className="bg-pink-500 text-white p-2 rounded-md shadow-lg">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="text-xs">👟</div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-3 pt-8">
              <div className="text-xs font-bold mb-1 bg-black/20 backdrop-blur-sm px-2 py-1 rounded">
                LM ++
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <span className="text-orange-500 text-xs font-bold">○</span>
                </div>
              </div>
            </div>

            {/* Player Photo */}
            <div className="relative mx-auto mb-4">
              <Avatar className="h-24 w-24 border-3 border-white/70 shadow-lg">
                <AvatarImage src={player.photoUrl} alt={displayName} />
                <AvatarFallback className="text-lg bg-white/30 text-white font-bold">
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

            {/* Player Name */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-white drop-shadow-lg truncate">
                {displayName}
              </h1>
            </div>

            {/* FIFA Stats */}
            <div className="flex justify-between items-center mb-4 bg-black/20 backdrop-blur-sm rounded-lg p-3">
              {funStatLabels.map(stat => (
                <div key={stat.key} className="text-center flex-1">
                  <div className="text-white text-xs font-bold mb-1">{stat.key}</div>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={funStats[stat.key] || ''}
                    onChange={(e) => updateStat(stat.key, e.target.value)}
                    className="w-12 text-center text-lg h-8 bg-white/90 border-0 text-black font-bold rounded"
                    placeholder="--"
                  />
                </div>
              ))}
            </div>

            {/* Play Style Badge */}
            <div className="flex justify-center mb-4">
              <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <span>{getPlayStyleIcon(playStyle)}</span>
                <span>{playStyle || 'No Style'}</span>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="mt-auto">
              <div className="flex justify-between items-center text-white text-sm">
                <span className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded">#{player.squadNumber || 'XX'}</span>
                <span className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded">Age {age}</span>
                <span className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded">{isGoalkeeper ? 'GK' : 'OUT'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-xl">
          <div className="p-4 h-full flex flex-col text-white">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFlipped(false)}
              className="absolute top-2 right-2 w-8 h-8 p-0 bg-white/20 hover:bg-white/30 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <h2 className="text-xl font-bold mb-6 text-center">Player Settings</h2>

            {/* Play Style Selector */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Play Style</label>
              <Select value={playStyle} onValueChange={handleSavePlayStyle}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select play style">
                    {playStyle && (
                      <div className="flex items-center gap-1">
                        <span>{getPlayStyleIcon(playStyle)}</span>
                        <span>{playStyle}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {playStylesWithIcons.map(style => (
                    <SelectItem key={style.value} value={style.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Settings Options */}
            <div className="space-y-3 mb-6">
              {onEdit && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-white border-white/20 hover:bg-white/10"
                  onClick={() => onEdit(player)}
                >
                  Edit Player Info
                </Button>
              )}
              
              {onSetCaptain && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-white border-white/20 hover:bg-white/10"
                  onClick={() => onSetCaptain(player)}
                >
                  {isCaptain ? 'Remove Captain' : 'Set as Captain'}
                </Button>
              )}

              {onManageParents && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-white border-white/20 hover:bg-white/10"
                  onClick={() => onManageParents(player)}
                >
                  Manage Parents
                </Button>
              )}

              {onRemoveFromSquad && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-400 border-red-400/50 hover:bg-red-400/10"
                  onClick={() => onRemoveFromSquad(player)}
                >
                  Remove from Squad
                </Button>
              )}
            </div>

            {/* Card Design Selector */}
            <div className="mt-auto">
              <label className="text-sm font-medium mb-2 block">Card Design</label>
              <Select value={selectedDesign} onValueChange={handleSaveDesign}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
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
};
