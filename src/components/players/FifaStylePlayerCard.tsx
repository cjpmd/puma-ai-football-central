import React, { useState, useRef } from 'react';
import { Player, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, Users, UploadCloud, Edit3, Trash2, UserMinus, Brain, Target, MessageSquare, BarChart3, Calendar as CalendarIcon, Replace, Settings2, Palette, Star, Shuffle, LogOut
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculateAge, getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const cardDesigns: Record<string, { bg: string, text: string, border?: string, nameColor?: string, statColor?: string, positionColor?: string }> = {
  goldRare: { bg: 'bg-gradient-to-br from-yellow-500 to-yellow-700', text: 'text-yellow-900', nameColor: 'text-yellow-900', statColor: 'text-yellow-900', positionColor: 'text-yellow-800' },
  silverRare: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-gray-800', nameColor: 'text-gray-800', statColor: 'text-gray-800', positionColor: 'text-gray-700' },
  bronzeRare: { bg: 'bg-gradient-to-br from-amber-700 to-amber-900', text: 'text-amber-100', nameColor: 'text-amber-100', statColor: 'text-amber-100', positionColor: 'text-amber-200' },
  goldCommon: { bg: 'bg-gradient-to-br from-yellow-300 to-yellow-500', text: 'text-yellow-800', nameColor: 'text-yellow-800', statColor: 'text-yellow-800', positionColor: 'text-yellow-700' },
  silverCommon: { bg: 'bg-gradient-to-br from-gray-100 to-gray-300', text: 'text-gray-700', nameColor: 'text-gray-700', statColor: 'text-gray-700', positionColor: 'text-gray-600' },
  bronzeCommon: { bg: 'bg-gradient-to-br from-amber-500 to-amber-700', text: 'text-amber-50', nameColor: 'text-amber-50', statColor: 'text-amber-50', positionColor: 'text-amber-100' },
  pumaBlack: { bg: 'bg-black text-white', text: 'text-gray-300', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-400' },
  pumaWhite: { bg: 'bg-white text-black', text: 'text-gray-600', nameColor: 'text-black', statColor: 'text-black', positionColor: 'text-gray-500', border: 'border-black/10' },
  icon: { bg: 'bg-gradient-to-br from-blue-400 to-purple-600 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  hero: { bg: 'bg-gradient-to-tr from-green-400 to-blue-500 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  futties: { bg: 'bg-gradient-to-br from-pink-500 to-purple-500 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  teamOfTheYear: { bg: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  teamOfTheSeason: { bg: 'bg-gradient-to-br from-lime-500 to-green-700 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  winterWildcards: { bg: 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  outOfThePosition: { bg: 'bg-gradient-to-br from-orange-500 to-red-500 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
  trophiesTitan: { bg: 'bg-gradient-to-br from-purple-700 to-yellow-500 text-white', text: 'text-gray-100', nameColor: 'text-white', statColor: 'text-white', positionColor: 'text-gray-200' },
};

interface FifaStylePlayerCardProps {
  player: Player;
  team: Team;
  onEdit: (player: Player) => void;
  onManageParents: (player: Player) => void;
  onRemoveFromSquad: (player: Player) => void;
  onUpdatePhoto: (player: Player, file: File) => void;
  onDeletePhoto: (player: Player) => void;
  onSaveFunStats: (player: Player, stats: Record<string, number>) => void;
  onSavePlayStyle: (player: Player, playStyles: string[]) => void;
  onSaveCardDesign: (player: Player, designId: string) => void;
  onManageAttributes: (player: Player) => void;
  onManageObjectives: (player: Player) => void;
  onManageComments: (player: Player) => void;
  onViewStats: (player: Player) => void;
  onViewHistory: (player: Player) => void;
  onTransferPlayer: (player: Player) => void;
  onLeaveTeam: (player: Player) => void;
}

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
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [funStats, setFunStats] = useState<Record<string, number>>(player.funStats || {});
  const [playStyle, setPlayStyle] = useState<string[]>(player.playStyle ? JSON.parse(player.playStyle) : []);
  const [cardDesignId, setCardDesignId] = useState<string>(player.cardDesignId || 'goldRare');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFunStatChange = (statName: string, value: number) => {
    setFunStats(prev => ({ ...prev, [statName]: value }));
  };

  const handleSaveFunStatsClick = () => {
    onSaveFunStats(player, funStats);
  };

  const handlePlayStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setPlayStyle(prev => {
      if (checked) {
        return [...prev, value];
      } else {
        return prev.filter(item => item !== value);
      }
    });
  };

  const handleSavePlayStyleClick = () => {
    onSavePlayStyle(player, playStyle);
  };

  const handleCardDesignChange = (designId: string) => {
    setCardDesignId(designId);
    onSaveCardDesign(player, designId);
  };
  
  const design = cardDesigns[player.cardDesignId || 'goldRare'] || cardDesigns.goldRare;
  const age = player.dateOfBirth ? calculateAge(new Date(player.dateOfBirth)) : 'N/A';
  const overallRating = player.attributes?.find(attr => attr.name === 'Overall')?.value || 75;
  
  const getTopPositions = () => {
    const positions = player.matchStats?.minutesByPosition || {};
    const positionEntries = Object.entries(positions).map(([position, minutes]) => ({ position, minutes: minutes as number }));
    const sortedPositions = positionEntries.sort((a, b) => b.minutes - a.minutes).slice(0, 3);
    return sortedPositions;
  };
  const topPositions = getTopPositions();

  return (
    <Card className={cn("w-full max-w-[280px] shadow-xl relative overflow-hidden transform transition-all duration-300 hover:scale-105", design.bg, design.border ? `border-2 ${design.border}` : '')}>
      <CardHeader className="p-3 relative z-10">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <p className={cn("font-bold text-2xl leading-none", design.statColor)}>{overallRating}</p>
            <p className={cn("text-sm font-medium", design.positionColor)}>{player.type === 'goalkeeper' ? 'GK' : 'OUT'}</p>
            {team?.logoUrl && (
              <Avatar className="h-8 w-8 mt-1 border-2 border-white/50">
                <AvatarImage src={team.logoUrl} alt={team.name} />
                <AvatarFallback>{team.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="relative group">
            <Avatar className="h-20 w-20 border-4 border-white/80 shadow-md">
              <AvatarImage src={player.photoUrl || undefined} alt={player.name} />
              <AvatarFallback className="text-2xl font-bold">{getInitials(player.name)}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-200 rounded-full">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 text-white hover:bg-white/20"
                onClick={handleUploadClick}
                title="Upload new photo"
              >
                <UploadCloud className="h-5 w-5" />
              </Button>
              {player.photoUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 text-white hover:bg-white/20 ml-1"
                  onClick={() => onDeletePhoto(player)}
                  title="Remove photo"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handlePhotoInputChange}
            />
          </div>
        </div>
        <h3 className={cn("text-xl font-bold tracking-tight mt-2 truncate", design.nameColor)} title={player.name}>
          {player.name} #{player.squadNumber}
        </h3>
        <div className="flex items-center space-x-2 text-xs mt-1">
          <Badge variant="secondary" className={cn(design.text, "bg-opacity-50")}>Age: {age}</Badge>
          <Badge variant={player.subscriptionType === 'full_squad' ? 'default' : 'outline'} className={cn(design.text, "bg-opacity-50")}>
            {player.subscriptionType === 'full_squad' ? 'Full Squad' : 'Training'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 relative z-10 text-center">
        <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
          {player.attributes?.slice(0, 6).map((attr, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className={cn("font-bold", design.statColor)}>{attr.value}</span>
              <span className={cn("text-muted-foreground", design.text)}>{attr.name}</span>
            </div>
          ))}
        </div>

        {topPositions.length > 0 && (
            <div className="mt-2 text-left">
                <p className={cn("text-xs font-semibold mb-1", design.text)}>Top Positions:</p>
                <div className="flex flex-col space-y-0.5">
                    {topPositions.map((pos, index) => (
                        <div key={index} className="flex items-center">
                            <span className={cn("text-xs font-medium mr-1", design.text)}>
                                {pos.position.replace(/SUB/g, 'S').replace(/TBD/g, '?')}:
                            </span>
                            <span className={cn("text-xs", design.text, "opacity-80")}>
                                { '+'.repeat(3 - index) } ({pos.minutes}m)
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </CardContent>

      <CardFooter className="p-2 flex justify-end relative z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn("hover:bg-white/20", design.text)}>
              <Settings2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Player Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(player)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Player Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageParents(player)}>
              <Users className="mr-2 h-4 w-4" /> Manage Parents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageAttributes(player)}>
              <Brain className="mr-2 h-4 w-4" /> Manage Attributes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageObjectives(player)}>
              <Target className="mr-2 h-4 w-4" /> Manage Objectives
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onManageComments(player)}>
              <MessageSquare className="mr-2 h-4 w-4" /> Manage Comments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewStats(player)}>
              <BarChart3 className="mr-2 h-4 w-4" /> View Stats
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewHistory(player)}>
              <CalendarIcon className="mr-2 h-4 w-4" /> View History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onTransferPlayer(player)}>
              <Replace className="mr-2 h-4 w-4" /> Transfer Player
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLeaveTeam(player)}>
              <LogOut className="mr-2 h-4 w-4" /> Player Left Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRemoveFromSquad(player)}>
              <UserMinus className="mr-2 h-4 w-4" /> Remove from Squad
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
       {/* Background Image/Pattern based on card type - ensure this is behind content */}
      {design.bg.includes('bg-gradient-to-br') || design.bg.includes('bg-gradient-to-tr') ? null : (
          <div 
            className={cn("absolute inset-0 z-0 opacity-20", design.bg)}
            style={ player.cardDesignId === "icon" || player.cardDesignId === "hero" ? { backgroundImage: `url('/lovable-uploads/e312db4c-9834-4d19-8b74-abf4e871c7c1.png')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          ></div>
      )}
    </Card>
  );
};
