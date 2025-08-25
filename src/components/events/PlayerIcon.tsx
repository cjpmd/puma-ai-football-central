
import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';
import { SquadPlayer } from '@/types/teamSelection';
import { formatPlayerName } from '@/utils/nameUtils';

interface PlayerIconProps {
  player: SquadPlayer;
  isDragging?: boolean;
  isCaptain?: boolean;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  isCircular?: boolean;
  positionAbbreviation?: string;
  showPositionLabel?: boolean;
  isLarger?: boolean;
  dragId?: string; // Custom drag ID for positioned players
  isSelectedInOtherTeams?: boolean; // New prop to indicate multi-team selection
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
  dragId,
  isSelectedInOtherTeams = false
}) => {
  // Enable dragging for available AND pending players
  const shouldEnableDrag = player.availabilityStatus === 'available' || player.availabilityStatus === 'pending';
  
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
    return formatPlayerName(player.name, nameDisplayOption);
  };

  const getAvailabilityStyle = () => {
    const baseStyle = isCircular ? 'rounded-full' : 'rounded-lg';
    
    switch (player.availabilityStatus) {
      case 'available':
        return `border-green-500 bg-green-50 ${baseStyle}`;
      case 'unavailable':
        return `border-red-500 bg-red-50 opacity-60 ${baseStyle}`;
      case 'maybe':
        return `border-yellow-500 bg-yellow-50 ${baseStyle}`;
      case 'pending':
        return `border-orange-500 bg-orange-50 ${baseStyle}`;
      default:
        return `border-gray-300 bg-gray-50 ${baseStyle}`;
    }
  };

  const actualIsDragging = isDragging || dndIsDragging;
  const circularSize = isLarger ? 'w-16 h-16' : 'w-14 h-14';

  if (isCircular) {
    return (
      <div 
        ref={shouldEnableDrag ? setNodeRef : undefined}
        {...(shouldEnableDrag ? listeners : {})}
        {...(shouldEnableDrag ? attributes : {})}
        className={`
          relative flex flex-col items-center justify-center ${circularSize} border-2
          ${getAvailabilityStyle()}
          ${actualIsDragging ? 'opacity-50' : 'shadow-sm'}
          ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : shouldEnableDrag ? 'cursor-grab print:cursor-default' : 'cursor-default'}
          ${(player.availabilityStatus === 'available' || player.availabilityStatus === 'pending') && shouldEnableDrag ? 'hover:scale-105 hover:shadow-md active:scale-110' : ''}
          transition-all duration-200 ease-in-out
          ${shouldEnableDrag ? 'touch-none select-none' : ''}
          print:scale-100 print:shadow-none
        `}
      >
        {/* Captain indicator */}
        {(isCaptain || player.squadRole === 'captain') && (
          <Crown className={`absolute -top-1 -right-1 ${isLarger ? 'h-4 w-4' : 'h-3 w-3'} text-yellow-500`} />
        )}
        
        {/* Multi-team selection indicator */}
        {isSelectedInOtherTeams && (
          <div className={`absolute -top-1 -left-1 ${isLarger ? 'h-4 w-4' : 'h-3 w-3'}`}>
            <Users className="h-full w-full text-blue-500" />
          </div>
        )}
        
        {/* Content inside circle - position abbreviation AND player name */}
        <div className="flex flex-col items-center justify-center text-center leading-none">
          {/* Position abbreviation above name if provided */}
          {showPositionLabel && positionAbbreviation && (
            <div className={`${isLarger ? 'text-xs' : 'text-xs'} font-bold text-blue-600 mb-0.5`}>
              {positionAbbreviation}
            </div>
          )}
          
          {/* Player name */}
          <div className={`${isLarger ? 'text-xs' : 'text-xs'} font-medium leading-tight`}>
            {getDisplayName()}
          </div>
          
          {/* Squad number below */}
          <div className={`${isLarger ? 'text-xs' : 'text-xs'} font-bold text-gray-600 mt-0.5`}>
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
        relative flex flex-col items-center p-2 rounded-lg border-2 min-w-[80px] max-w-[100px]
        ${getAvailabilityStyle()}
        ${actualIsDragging ? 'shadow-lg transform rotate-2' : 'shadow-sm'}
        ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : 'cursor-grab print:cursor-default'}
        transition-all duration-200
      `}
    >
      {/* Captain indicator */}
      {(isCaptain || player.squadRole === 'captain') && (
        <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
      )}
      
      {/* Multi-team selection indicator */}
      {isSelectedInOtherTeams && (
        <div className="absolute -top-1 -left-1 h-4 w-4">
          <Users className="h-full w-full text-blue-500" />
        </div>
      )}
      
      {/* Squad number */}
      <Badge 
        variant={player.type === 'goalkeeper' ? 'secondary' : 'outline'} 
        className="mb-1 text-xs"
      >
        #{player.squadNumber}
      </Badge>
      
      {/* Player name */}
      <span className="text-xs font-medium text-center leading-tight">
        {getDisplayName()}
      </span>
    </div>
  );
};
