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
  goldStandard: {
    className: 'border-2 border-yellow-500',
    background: 'linear-gradient(to bottom, #4C3D3D, #614848, #806460)',
  },
  blueWave: {
    className: 'border-2 border-blue-500',
    background: 'linear-gradient(to bottom, #2E4374, #456299, #5D7FB7)',
  },
  greenMachine: {
    className: 'border-2 border-green-500',
    background: 'linear-gradient(to bottom, #386641, #497A4F, #5B8E5E)',
  },
  redAlert: {
    className: 'border-2 border-red-500',
    background: 'linear-gradient(to bottom, #7A2E2E, #994545, #B75D5D)',
  },
  purpleReign: {
    className: 'border-2 border-purple-500',
    background: 'linear-gradient(to bottom, #4E2E7A, #624599, #7B5DB7)',
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

  const currentDesign = designs[player.card_design_id as keyof typeof designs] || designs.goldStandard;
  const playerStats = player.fun_stats as any || {};
  const overall = calculateOverall(playerStats);
  const playStyleDisplay = player.play_style || 'Balanced';
  
  // Handle missing user data
  const userName = 'Unknown User';
  const userEmail = 'No email';
  
  if (showBackside) {
    return (
      <div 
        className={`relative w-64 h-96 mx-auto cursor-pointer transform transition-transform duration-300 hover:scale-105 ${currentDesign.className}`}
        onClick={onFlip}
        style={{
          background: currentDesign.background,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overall Rating Badge */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
          {overall}
        </div>

        {/* Player Name */}
        <div className="absolute top-4 right-4 text-white text-right">
          <div className="font-bold text-sm">{player.name}</div>
          <div className="text-xs">{playStyleDisplay}</div>
        </div>

        {/* Player Image */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/4 w-32 h-32 rounded-full overflow-hidden">
          <img 
            src={player.photo_url || 'https://via.placeholder.com/150'} 
            alt={player.name} 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Player Info */}
        <div className="absolute bottom-4 left-4 text-white">
          <div className="font-bold text-sm">User ID: {player.user_id || 'N/A'}</div>
          <div className="text-xs">Email: {userEmail}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-64 h-96 mx-auto cursor-pointer transform transition-transform duration-300 hover:scale-105 ${currentDesign.className}`}
      onClick={onFlip}
      style={{
        background: currentDesign.background,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overall Rating Badge */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
        {overall}
      </div>

      {/* Player Name */}
      <div className="absolute top-4 right-4 text-white text-right">
        <div className="font-bold text-sm">{player.name}</div>
        <div className="text-xs">{player.play_style}</div>
      </div>

      {/* Player Image */}
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/4 w-32 h-32 rounded-full overflow-hidden">
        <img 
          src={player.photo_url || 'https://via.placeholder.com/150'} 
          alt={player.name} 
          className="w-full h-full object-cover" 
        />
      </div>
      
      {/* Player Stats */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          {Object.entries(player.match_stats || {}).slice(0, 6).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="font-bold text-white">{String(value)}</div>
              <div className="text-gray-200 text-[10px] uppercase">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Button */}
      {isEditable && (
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="absolute top-2 left-2 h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
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
