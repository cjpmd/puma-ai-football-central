
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
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ 
  player, 
  isDragging = false,
  isCaptain = false,
  nameDisplayOption = 'surname',
  isCircular = false,
  positionAbbreviation,
  showPositionLabel = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: player.id,
    disabled: player.availabilityStatus !== 'available',
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

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
    const baseStyle = isCircular ? 'rounded-full' : 'rounded-lg';
    
    switch (player.availabilityStatus) {
      case 'available':
        return `border-green-500 bg-green-50 ${baseStyle}`;
      case 'unavailable':
        return `border-red-500 bg-red-50 opacity-60 ${baseStyle}`;
      case 'maybe':
        return `border-yellow-500 bg-yellow-50 ${baseStyle}`;
      default:
        return `border-gray-300 bg-gray-50 ${baseStyle}`;
    }
  };

  const actualIsDragging = isDragging || dndIsDragging;

  if (isCircular) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`
          relative flex flex-col items-center justify-center w-16 h-16 border-2
          ${getAvailabilityStyle()}
          ${actualIsDragging ? 'shadow-lg scale-110' : 'shadow-sm'}
          ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : 'cursor-grab'}
          transition-all duration-200
        `}
      >
        {/* Captain indicator */}
        {(isCaptain || player.squadRole === 'captain') && (
          <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
        )}
        
        {/* Content inside circle - position abbreviation, name, squad number */}
        <div className="flex flex-col items-center justify-center text-center leading-none">
          {/* Position abbreviation above name if provided */}
          {showPositionLabel && positionAbbreviation && (
            <div className="text-xs font-bold text-blue-600 mb-0.5">
              {positionAbbreviation}
            </div>
          )}
          
          {/* Player name in center */}
          <div className="text-xs font-medium leading-tight">
            {getDisplayName()}
          </div>
          
          {/* Squad number below name */}
          <div className="text-xs font-bold text-gray-600 mt-0.5">
            #{player.squadNumber}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative flex flex-col items-center p-2 rounded-lg border-2 min-w-[80px] max-w-[100px]
        ${getAvailabilityStyle()}
        ${actualIsDragging ? 'shadow-lg transform rotate-2' : 'shadow-sm'}
        ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : 'cursor-grab'}
        transition-all duration-200
      `}
    >
      {/* Captain indicator */}
      {(isCaptain || player.squadRole === 'captain') && (
        <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
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
