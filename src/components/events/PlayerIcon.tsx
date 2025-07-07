import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { SquadPlayer } from '@/types/teamSelection';

interface PlayerIconProps {
  player: SquadPlayer;
  isDragging?: boolean;
  isCaptain?: boolean;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
  isCircular?: boolean;
  positionAbbreviation?: string;
  showPositionLabel?: boolean;
  isLarger?: boolean;
  dragId?: string;
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ 
  player, 
  isDragging = false,
  isCaptain = false,
  nameDisplayOption = 'surname',
  isCircular = false,
  positionAbbreviation,
  showPositionLabel = false,
  isLarger = false,
  dragId
}) => {
  const shouldEnableDrag = player.availabilityStatus === 'available';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: dragId || player.id,
    disabled: !shouldEnableDrag,
  });

  const getDisplayName = () => {
    const nameParts = player.name.split(' ');
    
    switch (nameDisplayOption) {
      case 'first':
        return nameParts[0] || player.name;
      case 'full':
        return player.name;
      case 'initials':
        return nameParts.map(part => part.charAt(0).toUpperCase()).join('.');
      case 'surname':
      default:
        return nameParts[nameParts.length - 1] || player.name;
    }
  };

  const getAvailabilityStyle = () => {
    switch (player.availabilityStatus) {
      case 'available':
        return 'border-emerald-400 bg-gradient-to-br from-emerald-400 to-green-600';
      case 'unavailable':
        return 'border-red-400 bg-gradient-to-br from-red-400 to-red-600 opacity-60';
      case 'maybe':
        return 'border-yellow-400 bg-gradient-to-br from-yellow-400 to-orange-500';
      default:
        return 'border-slate-400 bg-gradient-to-br from-slate-400 to-slate-600';
    }
  };

  const actualIsDragging = isDragging || dndIsDragging;
  const circularSize = isLarger ? 'w-18 h-18' : 'w-16 h-16';

  if (isCircular) {
    return (
      <div 
        ref={shouldEnableDrag ? setNodeRef : undefined}
        {...(shouldEnableDrag ? listeners : {})}
        {...(shouldEnableDrag ? attributes : {})}
        className={`
          relative flex flex-col items-center group
          ${actualIsDragging ? 'opacity-50 z-50' : 'z-10'}
          ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : shouldEnableDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          ${shouldEnableDrag ? 'hover:scale-105 active:scale-110' : ''}
          transition-all duration-200 ease-in-out
          touch-none select-none
        `}
      >
        {/* Main player avatar */}
        <div className={`
          ${circularSize} rounded-full border-4 border-white shadow-lg
          ${getAvailabilityStyle()}
          flex items-center justify-center relative overflow-hidden
          ${actualIsDragging ? 'rotate-12' : 'group-hover:shadow-xl'}
          transition-all duration-200
        `}>
          {/* Player initials/avatar */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          
          {/* Captain indicator */}
          {(isCaptain || player.squadRole === 'captain') && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-md">
              <Crown className="h-3 w-3 text-yellow-900" />
            </div>
          )}
        </div>
        
        {/* Player info below avatar */}
        <div className="mt-2 text-center min-w-0">
          {/* Position abbreviation */}
          {showPositionLabel && positionAbbreviation && (
            <div className="text-xs font-bold text-blue-600 mb-1">
              {positionAbbreviation}
            </div>
          )}
          
          {/* Player name */}
          <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap max-w-20 truncate">
            {getDisplayName().toUpperCase()}
          </div>
          
          {/* Squad number */}
          <div className="bg-black bg-opacity-60 text-white px-2 py-0.5 rounded-b text-xs">
            #{player.squadNumber}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        relative flex flex-col items-center p-3 rounded-xl border-2 min-w-[90px] max-w-[110px]
        ${getAvailabilityStyle()} border-white shadow-lg
        ${actualIsDragging ? 'shadow-2xl transform rotate-2 scale-105' : 'shadow-md'}
        ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        transition-all duration-200 hover:scale-105
        touch-none select-none
      `}
    >
      {/* Captain indicator */}
      {(isCaptain || player.squadRole === 'captain') && (
        <Crown className="absolute -top-2 -right-2 h-5 w-5 text-yellow-400 bg-white rounded-full p-1 shadow-md" />
      )}
      
      {/* Squad number */}
      <Badge 
        variant={player.type === 'goalkeeper' ? 'secondary' : 'outline'} 
        className="mb-2 text-xs bg-white border-white text-slate-700 shadow-sm"
      >
        #{player.squadNumber}
      </Badge>
      
      {/* Player name */}
      <span className="text-xs font-medium text-center leading-tight text-white drop-shadow-md">
        {getDisplayName()}
      </span>
    </div>
  );
};
