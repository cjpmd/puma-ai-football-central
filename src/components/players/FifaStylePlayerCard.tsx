
import React, { useState, useEffect } from 'react';
import { Player, Team } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings, Camera, Crown, ArrowLeft, User, Calendar, Hash, Shirt, Award, Users, Brain, Target, MessageSquare, BarChart3, UserMinus, RefreshCw, Edit, X, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { playStylesService } from '@/types/playStyles';
import { PlayStylesManager } from '@/components/players/PlayStylesManager';

interface FifaStylePlayerCardProps {
  player: Player;
  team?: Team;
  onEdit?: (player: Player) => void;
  onManageParents?: (player: Player) => void;
  onRemoveFromSquad?: (player: Player) => void;
  onUpdatePhoto?: (player: Player, file: File) => void;
  onDeletePhoto?: (player: Player) => void;
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
  onClose?: () => void;
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
  },
  redCrystal: {
    name: "Red Crystal",
    bgImage: "url('/lovable-uploads/f930e1ff-b50a-437b-94f8-a51a79bf9fac.png')",
    border: "border-red-400",
    textColor: "text-red-900",
    shadow: "shadow-red-500/50",
  },
  galaxyGems: {
    name: "Galaxy Gems",
    bgImage: "url('/lovable-uploads/f10817a5-248b-4981-8539-e72f55ca861a.png')",
    border: "border-purple-400",
    textColor: "text-purple-900",
    shadow: "shadow-purple-500/50",
  }
};

// Get all available play styles (default + custom)
const playStylesWithIcons = playStylesService.getAllPlayStyles();

// Create a list of valid play style values for easier filtering
const validPlayStyleValues = playStylesWithIcons.map(s => s.value);

export const FifaStylePlayerCard: React.FC<FifaStylePlayerCardProps> = ({
  player,
  team,
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
  onLeaveTeam,
  onClose
}) => {
  const { toast } = useToast();
  const [flipped, setFlipped] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const { hasPermission, loading: authzLoading } = useAuthorization();
  const [canManageCard, setCanManageCard] = useState(false);
  const [isUserStaffContext, setIsUserStaffContext] = useState(false);

  // Updated parsePlayStyles function
  const parsePlayStyles = (playStyleData: string | string[] | undefined): string[] => {
    let rawStyles: string[] = [];
    if (!playStyleData) {
      // No data, empty styles
    } else if (Array.isArray(playStyleData)) {
      rawStyles = playStyleData.map(s => String(s)); // Ensure all elements are strings
    } else if (typeof playStyleData === 'string') {
      try {
        const parsed = JSON.parse(playStyleData);
        if (Array.isArray(parsed)) {
          rawStyles = parsed.map(s => String(s)); // Ensure all elements are strings
        } else if (typeof parsed === 'string') {
          rawStyles = [parsed];
        } // else, parsed is not an array or string, ignore
      } catch {
        // If JSON parsing fails, treat as a single play style string, if not empty
        if (playStyleData.trim().length > 0) {
          rawStyles = [playStyleData.trim()];
        }
      }
    }
    
    // Filter for valid and unique styles from the known list, and limit to 3
    const uniqueFilteredStyles = [...new Set(rawStyles.filter(style => validPlayStyleValues.includes(style)))];
    return uniqueFilteredStyles.slice(0, 3);
  };

  const [selectedDesign, setSelectedDesign] = useState(player.cardDesignId || "goldBallon");
  const [funStats, setFunStats] = useState(player.funStats || {});
  const [selectedPlayStyles, setSelectedPlayStyles] = useState<string[]>(
    parsePlayStyles(player.playStyle)
  );
  const [showPlayStylesManager, setShowPlayStylesManager] = useState(false);

  // useEffect to synchronize state with player prop changes
  useEffect(() => {
    const parsed = parsePlayStyles(player.playStyle);
    if (JSON.stringify(parsed) !== JSON.stringify(selectedPlayStyles)) {
      setSelectedPlayStyles(parsed);
    }
    setFunStats(player.funStats || {});
    setSelectedDesign(player.cardDesignId || "goldBallon");
  }, [player.playStyle, player.funStats, player.cardDesignId, selectedPlayStyles, player]);

  // useEffect to determine if the current user can manage this card and if they are staff
  useEffect(() => {
    if (authLoading || authzLoading || !user || !profile || !player) {
      setCanManageCard(false);
      setIsUserStaffContext(false); // Reset staff context
      return;
    }

    let canManage = false;
    let isStaff = false; // Local variable to determine if access is due to staff role

    // Check staff permissions first
    const targetTeamId = team?.id || player.team_id;
    if (targetTeamId && hasPermission({ resource: 'players', action: 'manage', resourceId: targetTeamId })) {
      canManage = true;
      isStaff = true;
    } else if (hasPermission({ resource: 'players', action: 'manage' })) { // Broader manage permission (e.g., club admin, global admin)
      canManage = true;
      isStaff = true;
    }

    // If not identified as staff yet, check if player or parent
    if (!isStaff) {
      if (player.user_id && profile.id === player.user_id) { // Player themselves
        canManage = true;
      } else if (profile.managed_player_ids && profile.managed_player_ids.includes(player.id)) { // Parent/guardian
        canManage = true;
      }
    }
    
    setCanManageCard(canManage);
    setIsUserStaffContext(isStaff); // Set the staff context state

  }, [user, profile, player, team, hasPermission, authLoading, authzLoading]);

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

  // Get top 2 positions with minutes (excluding SUB and TBD)
  const getTopPositions = () => {
    const minutesByPosition = player.matchStats?.minutesByPosition || {};
    const filteredPositions = Object.entries(minutesByPosition)
      .filter(([position]) => position !== 'SUB' && position !== 'TBD') // Exclude SUB and TBD
      .map(([position, minutes]) => ({
        position,
        minutes: Number(minutes) || 0
      }))
      .filter(p => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 2);

    // Add appropriate number of plus signs for top 2
    return filteredPositions.map((pos, index) => ({
      ...pos,
      display: index === 0 ? `${pos.position}+++` : `${pos.position}++`
    }));
  };

  // Check for missing critical information
  const getMissingInfoAlerts = () => {
    const alerts = [];
    
    // Check for missing name (first name or surname)
    const fullName = player.name || '';
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) {
      alerts.push({ icon: User, message: 'Missing player name' });
    } else if (nameParts.length === 1) {
      alerts.push({ icon: User, message: 'Missing first name or surname' });
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

  // Updated displayName logic
  let determinedDisplayName = player.name || 'No Name';
  const nameOnShirtValue = player.kit_sizes?.nameOnShirt;

  if (nameOnShirtValue && nameOnShirtValue.trim() !== "") {
    const playerFullNameParts = player.name ? player.name.split(' ') : [];
    // Handle cases where player.name might be just a surname or single name
    const playerLastName = playerFullNameParts.length > 0 ? playerFullNameParts[playerFullNameParts.length - 1] : '';
    
    // Use nameOnShirt if it's different from the extracted last name, 
    // OR if player.name is a single word (suggesting nameOnShirt is a deliberate choice like a nickname).
    if (nameOnShirtValue.trim().toLowerCase() !== playerLastName.trim().toLowerCase() || playerFullNameParts.length <= 1) {
      determinedDisplayName = nameOnShirtValue.trim();
    }
  }

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
    backgroundPosition: 'center 20%'
  };

  // Define allowed pointer events
  type AllowedPointerEvents = "auto" | "none";

  // Updated getFaceStyle with explicit typing
  const getFaceStyle = (face: "front" | "back"): React.CSSProperties => {
    // face is visible if:
    //  - front face, not flipped
    //  - back face, flipped
    const isVisible = (face === "front" && !flipped) || (face === "back" && flipped);
    return {
      zIndex: isVisible ? 20 : 10,
      pointerEvents: isVisible ? "auto" : "none" as AllowedPointerEvents,
    };
  };

  // --- Handler for Player Action buttons ---
  const handleButtonAction = (
    e: React.MouseEvent<HTMLButtonElement>,
    handler?: (player: Player) => void,
    actionName?: string
  ) => {
    console.log(`[FifaCard] handleButtonAction: Action "${actionName}" for player "${player.name}". Flipped: ${flipped}`);
    e.preventDefault();
    e.stopPropagation();
    if (handler) {
      console.log(`[FifaCard] Handler found for "${actionName}". Executing handler.`);
      handler(player);
    } else {
      console.warn(`[FifaCard] No handler provided for action "${actionName}".`);
      if (toast) {
        toast({
          title: "Action Not Implemented",
          description: `The action "${actionName}" is not available for this player.`,
          variant: "destructive",
        });
      } else {
        console.error("[FifaCard] Toast function is not available to report unimplemented action.");
      }
    }
  };

  // Container with perspective for 3D effect
  return (
    <div className="w-[300px] h-[450px] mx-auto" style={{ perspective: '1000px' }}>
      <div 
        className="relative w-full h-full transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          zIndex: 100, 
          position: 'relative'
        }}
      >
        {/* Front of card */}
        <div 
          className={
            `absolute inset-0 w-full h-full rounded-2xl ${currentDesign.border} border-4 ${currentDesign.shadow} shadow-xl overflow-hidden`
          }
          style={{
            ...cardStyle,
            ...getFaceStyle("front"),
            backfaceVisibility: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        >
          {canManageCard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFlipped(true)}
              className="absolute top-3 right-3 w-8 h-8 p-0 bg-black/30 hover:bg-black/40 rounded-full z-20 backdrop-blur-sm"
              title="Manage Player Card"
            >
              <Settings className="h-4 w-4 text-white" />
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-3 right-14 w-8 h-8 p-0 bg-black/30 hover:bg-black/40 rounded-full z-20 backdrop-blur-sm"
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          )}

          {hasAlerts && (
            <div className="absolute top-3 left-3 flex flex-row flex-wrap gap-1 z-20">
              {missingInfoAlerts.slice(0, 3).map((alert, index) => {
                const IconComponent = alert.icon;
                return (
                  <div key={index} title={alert.message} className="bg-orange-500/90 rounded-full p-1">
                    <IconComponent className="h-3 w-3 text-white" />
                  </div>
                );
              })}
            </div>
          )}

          {isCaptain && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-yellow-500/90 rounded-full px-2 py-1">
              <Crown className="h-4 w-4 text-white" />
              <span className="text-white text-xs font-bold">{captainCount}</span>
            </div>
          )}

          {potmCount > 0 && (
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-purple-500/90 rounded-full px-2 py-1">
              <Award className="h-4 w-4 text-white" />
              <span className="text-white text-xs font-bold">{potmCount}</span>
            </div>
          )}

          <div className="p-4 h-full flex flex-col justify-end relative z-10">
            {topPositions.length > 0 && ( 
              <div className={`absolute left-2 space-y-0.5 ${hasAlerts ? 'top-16' : 'top-3'}`}>
                {topPositions.map((pos) => (
                  <div key={pos.position} className="bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-lg border border-white/30">
                    {pos.display}
                  </div>
                ))}
              </div>
            )}

            <div className="relative mx-auto mb-4 h-44 flex items-center justify-center">
              <div className="relative h-40 w-40">
                {/* Custom photo container with feathered border */}
                <div 
                  className="h-40 w-40 rounded-full overflow-hidden border-3 border-white/70 shadow-lg"
                  style={{
                    background: player.photoUrl ? 'none' : 'rgba(255,255,255,0.3)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1), 0 8px 32px rgba(0,0,0,0.3)'
                  }}
                >
                  {player.photoUrl ? (
                    <img 
                      src={player.photoUrl} 
                      alt={determinedDisplayName}
                      className="h-full w-full object-cover"
                      style={{
                        maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white font-bold text-2xl">
                      {player.name ? getInitials(player.name) : 'PL'}
                    </div>
                  )}
                </div>
                {onUpdatePhoto && canManageCard && (
                  <label className="absolute -bottom-2 -right-2 bg-white/90 text-gray-800 rounded-full p-2 cursor-pointer hover:bg-white transition-colors shadow-lg">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-center">
                <h1 className="text-xl font-bold text-white drop-shadow-lg truncate">
                  {determinedDisplayName}
                </h1>
              </div>

              <div className="flex justify-between items-center px-1">
                {funStatLabels.map(stat => (
                  <div key={stat.key} className="text-center flex-1">
                    <div className="text-white text-xs font-bold mb-1 drop-shadow-md">{stat.key}</div>
                    <div className="text-white text-lg font-bold drop-shadow-md">
                      {funStats[stat.key] || '--'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 h-8 items-center">
                {selectedPlayStyles.map((style, index) => (
                  <div key={index} className="text-2xl drop-shadow-lg leading-none">
                    {getPlayStyleIcon(style)}
                  </div>
                ))}
              </div>

              {/* Modified text section at the bottom */}
              <div className={`grid grid-cols-3 text-sm font-bold pt-3 ${currentDesign.textColor}`}>
                <span className="text-left pl-1">
                  #{player.squadNumber || 'XX'}
                </span>
                <span className="text-center">
                  Age {age}
                </span>
                <span className="text-right pr-1">
                  {isGoalkeeper ? 'GK' : 'OUTFIELD'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card - management view */}
        <div 
          className={
            `absolute inset-0 w-full h-full rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-xl overflow-hidden flex flex-col`
          }
          style={{
            ...getFaceStyle("back"),
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        >
          {/* Header: place Back and Close Buttons at top-right like the Front */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between bg-gray-800 relative">
            <span className="text-lg font-bold text-white mx-auto w-full flex justify-center">Player Management</span>
            <div className="absolute right-3 top-3 flex space-x-2">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                  className="w-8 h-8 p-0 bg-white/20 hover:bg-white/30 rounded-full text-white z-30" 
                  style={{ pointerEvents: 'auto' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={e => { e.preventDefault(); e.stopPropagation(); setFlipped(false); }}
                className="w-8 h-8 p-0 bg-white/20 hover:bg-white/30 rounded-full text-white z-30"
                style={{ pointerEvents: 'auto' }}
                title="Back to card front"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Content - Compact layout, ensure it's scrollable and interactive */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto" style={{ position: 'relative', zIndex: 1 }}>
            {/* Player Actions - All 9 buttons in 3x3 grid */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Player Actions</h3>
              
              <div 
                className="grid grid-cols-3 gap-1"
                style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onEdit, 'Edit Player')}
                  title="Edit Player"
                  disabled={!onEdit}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onManageParents, 'Manage Parents')}
                  title="Manage Parents"
                  disabled={!onManageParents}
                >
                  <Users className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onManageAttributes, 'Manage Attributes')}
                  title="Manage Attributes"
                  disabled={!onManageAttributes}
                >
                  <Brain className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onManageObjectives, 'Manage Objectives')}
                  title="Manage Objectives"
                  disabled={!onManageObjectives}
                >
                  <Target className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onManageComments, 'Manage Comments')}
                  title="Manage Comments"
                  disabled={!onManageComments}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onViewStats, 'View Statistics')}
                  title="View Statistics"
                  disabled={!onViewStats}
                >
                  <BarChart3 className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onViewHistory, 'View History')}
                  title="View History"
                  disabled={!onViewHistory}
                >
                  <Calendar className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-white/20 hover:bg-white/10 text-white bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onTransferPlayer, 'Transfer Player')}
                  title="Transfer Player"
                  disabled={!onTransferPlayer || !isUserStaffContext}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 border-red-400/50 hover:bg-red-400/10 text-red-400 bg-transparent text-xs"
                  onClick={e => handleButtonAction(e, onLeaveTeam, 'Leave Team')}
                  title="Leave Team"
                  disabled={!onLeaveTeam || !isUserStaffContext}
                >
                  <UserMinus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Photo Management */}
            {onDeletePhoto && player.photoUrl && (
              <div className="border-t border-white/20 pt-3">
                <label className="text-sm font-medium mb-2 block text-white">Photo Management</label>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs"
                  onClick={e => handleButtonAction(e, onDeletePhoto, 'Delete Photo')}
                  title="Delete Photo"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete Photo
                </Button>
              </div>
            )}

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
};

export default FifaStylePlayerCard;
