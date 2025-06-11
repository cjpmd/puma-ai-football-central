
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

const cardDesigns = {
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
    bgGradient: "from-purple-500 via-pink-500 to-red-500",
    border: "border-purple-400",
    textColor: "text-white",
    shadow: "shadow-purple-500/50",
  }
};

const playStyles = [
  "Aerial", "Rapid", "Technical", "Trickster", "Finesse Shot", 
  "Power Shot", "Intercept", "Pace Merchant", "Playmaker", 
  "Target Man", "Poacher", "Defensive", "Box-to-Box"
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
  const [selectedDesign, setSelectedDesign] = useState(player.cardDesignId || "goldRare");
  const [funStats, setFunStats] = useState(player.funStats || {});
  const [playStyle, setPlayStyle] = useState(player.playStyle || "");

  const currentDesign = cardDesigns[selectedDesign as keyof typeof cardDesigns] || cardDesigns.goldRare;

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
    setFunStats(prev => ({ ...prev, [key]: numValue }));
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

  const handleSaveStats = () => {
    if (onSaveFunStats) {
      onSaveFunStats(player, funStats);
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

  return (
    <div className="w-[280px] h-[420px] perspective-1000 mx-auto">
      <div
        className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ${
          flipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front of Card */}
        <div className={`absolute w-full h-full backface-hidden rounded-2xl bg-gradient-to-br ${currentDesign.bgGradient} ${currentDesign.border} border-2 ${currentDesign.shadow} shadow-xl`}>
          {/* Settings Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFlipped(true)}
            className="absolute top-2 right-2 w-8 h-8 p-0 bg-black/20 hover:bg-black/30 rounded-full z-10"
          >
            <Settings className="h-4 w-4 text-white" />
          </Button>

          {/* Alerts */}
          {hasAlerts && (
            <div className="absolute top-2 left-2 flex gap-1 z-10">
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
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <Crown className="h-5 w-5 text-yellow-300" />
            </div>
          )}

          <div className={`p-4 h-full flex flex-col ${currentDesign.textColor}`}>
            {/* Header */}
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold truncate">{displayName}</h3>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-2xl font-bold">#{player.squadNumber || 'XX'}</span>
                <Badge variant="secondary" className="text-xs">
                  {getSubscriptionLabel(player.subscriptionType || 'full_squad')}
                </Badge>
              </div>
            </div>

            {/* Player Photo */}
            <div className="relative mx-auto mb-3">
              <Avatar className="h-20 w-20 border-2 border-white/50">
                <AvatarImage src={player.photoUrl} alt={displayName} />
                <AvatarFallback className="text-sm bg-white/20">
                  {player.name ? getInitials(player.name) : 'PL'}
                </AvatarFallback>
              </Avatar>
              {onUpdatePhoto && (
                <label className="absolute -bottom-1 -right-1 bg-white/80 text-gray-800 rounded-full p-1 cursor-pointer hover:bg-white transition-colors">
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
            <div className="text-center text-xs mb-3 space-y-1">
              <div>{isGoalkeeper ? 'Goalkeeper' : 'Outfield'} • Age {age}</div>
              <div className="flex justify-center gap-3">
                <span>Games: {player.matchStats?.totalGames || 0}</span>
                <span>Mins: {player.matchStats?.totalMinutes || 0}</span>
              </div>
              {topPositions.length > 0 && (
                <div className="text-xs">
                  {topPositions.map((pos, idx) => (
                    <span key={pos.position} className="mr-2">
                      {pos.position}: {pos.minutes}m
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* FIFA Stats */}
            <div className="grid grid-cols-3 gap-1 mb-3 flex-1">
              {funStatLabels.map(stat => (
                <div key={stat.key} className="text-center">
                  <div className="text-xs font-semibold mb-1">{stat.key}</div>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={funStats[stat.key] || ''}
                    onChange={(e) => updateStat(stat.key, e.target.value)}
                    onBlur={handleSaveStats}
                    className="w-full text-center text-xs h-7 bg-white/80 border-0 text-black font-bold"
                    placeholder="--"
                  />
                </div>
              ))}
            </div>

            {/* Play Style */}
            <div className="mb-2">
              <Select value={playStyle} onValueChange={handleSavePlayStyle}>
                <SelectTrigger className="w-full h-7 text-xs bg-white/80 border-0 text-black">
                  <SelectValue placeholder="Play Style" />
                </SelectTrigger>
                <SelectContent>
                  {playStyles.map(style => (
                    <SelectItem key={style} value={style} className="text-xs">
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Badge */}
            {team?.logoUrl && (
              <div className="flex justify-center mt-auto">
                <img
                  src={team.logoUrl}
                  alt="Team Badge"
                  className="w-8 h-8 object-contain opacity-80"
                />
              </div>
            )}
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
