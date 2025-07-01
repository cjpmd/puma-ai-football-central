import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreVertical, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface FifaStylePlayerCardProps {
  player: any;
  showBackside?: boolean;
  onFlip: () => void;
  isEditable?: boolean;
  onEdit?: () => void;
}

const calculateOverall = (stats: any) => {
  if (!stats) return 50;
  const { pace, shooting, passing, dribbling, defending, physical } = stats;
  const total = pace + shooting + passing + dribbling + defending + physical;
  return Math.round(total / 6);
};

const designs = {
  goldRare: {
    className: 'border-2 border-yellow-400',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #92400e 75%, #451a03 100%)',
    borderGlow: 'shadow-lg shadow-yellow-400/50',
  },
  silverRare: {
    className: 'border-2 border-gray-400',
    background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 25%, #6b7280 50%, #374151 75%, #111827 100%)',
    borderGlow: 'shadow-lg shadow-gray-400/50',
  },
  bronzeRare: {
    className: 'border-2 border-amber-600',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #92400e 75%, #451a03 100%)',
    borderGlow: 'shadow-lg shadow-amber-600/50',
  },
  purpleSpecial: {
    className: 'border-2 border-purple-400',
    background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 25%, #9333ea 50%, #7c3aed 75%, #5b21b6 100%)',
    borderGlow: 'shadow-lg shadow-purple-400/50',
  },
  blueRare: {
    className: 'border-2 border-blue-400',
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 25%, #2563eb 50%, #1d4ed8 75%, #1e3a8a 100%)',
    borderGlow: 'shadow-lg shadow-blue-400/50',
  }
};

export const FifaStylePlayerCard: React.FC<FifaStylePlayerCardProps> = ({ 
  player, 
  showBackside = false, 
  onFlip,
  isEditable = false,
  onEdit
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleEdit = () => {
    setIsMenuOpen(false);
    if (onEdit) {
      onEdit();
    }
  };

  const currentDesign = designs[player.card_design_id as keyof typeof designs] || designs.goldRare;
  const playerStats = player.fun_stats as any || {};
  const overall = calculateOverall(playerStats);
  const playStyleDisplay = player.play_style || 'Balanced';
  
  // Handle missing user data
  const userName = 'Unknown User';
  const userEmail = 'No email';
  
  // Calculate position abbreviation
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

  if (showBackside) {
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
        {/* Card Header - Overall Rating and Position */}
        <div className="absolute top-4 left-4 flex flex-col items-center">
          <div className="bg-black/80 text-white rounded-lg px-2 py-1 text-center">
            <div className="text-2xl font-bold leading-none">{overall}</div>
            <div className="text-xs font-semibold">{positionAbbr}</div>
          </div>
        </div>

        {/* Settings Icon */}
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white/40 rounded-sm"></div>
          </div>
        </div>

        {/* Player Image */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-40 h-40 rounded-full overflow-hidden border-4 border-white/30">
          <img 
            src={player.photo_url || 'https://via.placeholder.com/150'} 
            alt={player.name} 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Player Name */}
        <div className="absolute bottom-20 left-4 right-4 text-center">
          <div className="bg-black/60 rounded-lg py-2 px-4">
            <h3 className="text-white font-bold text-lg">{player.name}</h3>
            <p className="text-white/80 text-sm">{playStyleDisplay}</p>
          </div>
        </div>

        {/* Card Number and Age */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white/70 text-sm">
          <span>#{player.squad_number || 0}</span>
          <span>Age {age}</span>
          <span>OUTFIELD</span>
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

      {/* Edit Button */}
      {isEditable && (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="absolute top-2 left-2 h-8 w-8 p-0 z-20 bg-black/20 hover:bg-black/40">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
