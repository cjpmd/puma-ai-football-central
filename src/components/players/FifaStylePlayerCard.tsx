
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Player, Team } from '@/types';
import { getInitials, formatDate, calculateAge } from '@/lib/utils';
import { Edit3, Users, UserMinus, UploadCloud, Palette, Sliders, Brain, Target, MessageSquare, BarChart3, Calendar as CalendarIcon, Settings, RefreshCw, LogOut, Trash2 } from 'lucide-react';

export interface FifaStylePlayerCardProps {
  player: Player;
  team?: Team | null; // Team can be null or undefined
  onEdit: (player: Player) => void;
  onManageParents: (player: Player) => void;
  onRemoveFromSquad: (player: Player) => void;
  onUpdatePhoto: (player: Player, file: File) => void;
  onDeletePhoto?: (player: Player) => void; // Made optional
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
  onDeletePhoto, // Consuming the optional prop
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

  const handlePhotoIconClick = () => {
    const fileInput = document.getElementById(`file-input-${player.id}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpdatePhoto(player, file);
    }
  };
  
  const renderAttribute = (label: string, value: string | number | undefined, icon?: React.ReactNode) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center text-muted-foreground">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
        <span className="font-semibold">{value}</span>
      </div>
    );
  };


  const overallRating = player.attributes?.find(attr => attr.name === 'Overall')?.value || 'N/A';
  const primaryPosition = player.attributes?.find(attr => attr.name === 'Primary Position')?.value || 'N/A';

  return (
    <Card className="w-full max-w-xs shadow-lg rounded-xl overflow-hidden relative transform transition-all hover:scale-105 bg-gradient-to-br from-gray-800 via-slate-800 to-gray-900 text-white border-slate-700">
      <input
        type="file"
        id={`file-input-${player.id}`}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />
      <CardHeader className="p-4 relative">
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 text-white border-slate-700">
              <DropdownMenuLabel className="text-slate-400">Player Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Player
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageParents(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <Users className="mr-2 h-4 w-4" /> Manage Parents
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={handlePhotoIconClick} className="hover:bg-slate-700 focus:bg-slate-700">
                <UploadCloud className="mr-2 h-4 w-4" /> Update Photo
              </DropdownMenuItem>
              {player.photoUrl && onDeletePhoto && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeletePhoto(player); }} className="hover:bg-slate-700 focus:bg-slate-700 text-red-400 hover:text-red-300 focus:text-red-300">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Photo
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={() => onManageAttributes(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <Brain className="mr-2 h-4 w-4" /> Manage Attributes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageObjectives(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <Target className="mr-2 h-4 w-4" /> Manage Objectives
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageComments(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <MessageSquare className="mr-2 h-4 w-4" /> Manage Comments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewStats(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <BarChart3 className="mr-2 h-4 w-4" /> View Stats
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <CalendarIcon className="mr-2 h-4 w-4" /> View History
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={() => onSaveCardDesign(player, 'new_design_id')} className="hover:bg-slate-700 focus:bg-slate-700"> {/* Placeholder for actual design selection */}
                <Palette className="mr-2 h-4 w-4" /> Change Card Design
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSavePlayStyle(player, ['new_style'])} className="hover:bg-slate-700 focus:bg-slate-700"> {/* Placeholder for actual style selection */}
                <Sliders className="mr-2 h-4 w-4" /> Edit Play Style
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={() => onTransferPlayer(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                 <RefreshCw className="mr-2 h-4 w-4" /> Transfer Player
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLeaveTeam(player)} className="hover:bg-slate-700 focus:bg-slate-700">
                <LogOut className="mr-2 h-4 w-4" /> Player Leaving Team
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700"/>
              <DropdownMenuItem onClick={() => onRemoveFromSquad(player)} className="hover:bg-slate-700 focus:bg-slate-700 text-red-400 hover:text-red-300 focus:text-red-300">
                <UserMinus className="mr-2 h-4 w-4" /> Remove from Squad
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20 border-2 border-slate-600 relative group">
            <AvatarImage src={player.photoUrl || undefined} alt={player.name} className="object-cover" />
            <AvatarFallback className="bg-slate-700 text-slate-400 text-2xl">
              {getInitials(player.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">{player.name}</CardTitle>
            <div className="text-sm text-slate-400 flex items-center">
              #{player.squadNumber || 'N/A'}
              <span className="mx-1.5 text-slate-600">•</span>
              {primaryPosition}
              <span className="mx-1.5 text-slate-600">•</span>
              Age: {player.dateOfBirth ? calculateAge(new Date(player.dateOfBirth)) : 'N/A'}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <Badge variant="secondary" className="text-sm bg-slate-700 text-slate-300 hover:bg-slate-600">
            {player.type === 'goalkeeper' ? 'Goalkeeper' : 'Outfield'}
          </Badge>
          <div className="text-4xl font-bold text-amber-400">{overallRating}</div>
        </div>

        <div className="space-y-1.5">
          {renderAttribute("Subscription", player.subscriptionType === 'full_squad' ? 'Full Squad' : player.subscriptionType === 'training' ? 'Training' : player.subscriptionType, <CalendarIcon className="h-3 w-3"/>)}
          {renderAttribute("Status", player.subscriptionStatus?.toUpperCase(), undefined)}
          {team?.name && renderAttribute("Team", team.name)}
        </div>

        {/* Attributes Section - simple example for now */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 pt-2 border-t border-slate-700/50">
          {player.attributes?.filter(attr => !['Overall', 'Primary Position'].includes(attr.name)).slice(0,6).map(attr => (
             <div key={attr.name} className="text-center">
               <p className="text-xs text-slate-400 uppercase tracking-wider">{attr.name.substring(0,3)}</p>
               <p className="text-lg font-semibold">{attr.value}</p>
             </div>
          ))}
        </div>
      </CardContent>

      {team?.logoUrl && (
        <CardFooter className="p-2 bg-slate-800/50 flex justify-end">
           <img src={team.logoUrl} alt={`${team.name} logo`} className="h-6 opacity-50" />
        </CardFooter>
      )}
    </Card>
  );
};
