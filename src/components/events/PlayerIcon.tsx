
import { useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
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
  dragId?: string;
  isSelectedInOtherTeams?: boolean;
  compact?: boolean;
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
  isSelectedInOtherTeams = false,
  compact = false
}) => {
  const shouldEnableDrag = player.availabilityStatus === 'available' || player.availabilityStatus === 'pending';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: dndIsDragging,
  } = useDraggable({
    id: dragId || player.id,
    disabled: !shouldEnableDrag,
    data: {
      player: player,
      type: 'player'
    }
  });

  const getDisplayName = () => {
    return formatPlayerName(player.name, nameDisplayOption);
  };

  const getAvailabilityStyle = () => {
    const baseStyle = isCircular ? 'rounded-full' : 'rounded-lg';
    // Dark glass background — availability indicated by border colour only
    switch (player.availabilityStatus) {
      case 'available':
        return `border-puma-purple-400 ${baseStyle}`;
      case 'unavailable':
        return `border-red-500 opacity-60 ${baseStyle}`;
      case 'maybe':
        return `border-amber-400 ${baseStyle}`;
      case 'pending':
        return `border-orange-400 ${baseStyle}`;
      default:
        return `border-white/20 ${baseStyle}`;
    }
  };

  const actualIsDragging = isDragging || dndIsDragging;
  const circularSize = compact ? 'w-8 h-8' : isLarger ? 'w-16 h-16' : 'w-14 h-14';
  const textSize = compact ? 'text-[8px]' : 'text-xs';

  if (isCircular) {
    return (
      <div 
        ref={shouldEnableDrag ? setNodeRef : undefined}
        {...(shouldEnableDrag ? listeners : {})}
        {...(shouldEnableDrag ? attributes : {})}
        className={`
          relative flex flex-col items-center justify-center ${circularSize} border-2
          ${getAvailabilityStyle()}
          ${actualIsDragging ? 'opacity-50' : ''}
          ${player.availabilityStatus === 'unavailable' ? 'cursor-not-allowed' : shouldEnableDrag ? 'cursor-grab print:cursor-default' : 'cursor-default'}
          ${(player.availabilityStatus === 'available' || player.availabilityStatus === 'pending') && shouldEnableDrag ? 'hover:scale-105 active:scale-110' : ''}
          transition-all duration-200 ease-in-out
          ${shouldEnableDrag ? 'touch-none select-none' : ''}
          print:scale-100 print:shadow-none
        `}
      style={{ background: 'rgba(12,6,22,0.75)', backdropFilter: 'blur(6px)', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}
      >
        {/* Captain indicator */}
        {(isCaptain || player.squadRole === 'captain') && (
          <div className={`absolute -top-1 -right-1 ${compact ? 'w-2.5 h-2.5 text-[6px]' : isLarger ? 'w-4 h-4 text-[8px]' : 'w-3 h-3 text-[7px]'} bg-yellow-500 rounded-full flex items-center justify-center`}>
            <span className="font-bold text-white leading-none">C</span>
          </div>
        )}
        
        {/* Multi-team selection indicator */}
        {isSelectedInOtherTeams && (
          <div className={`absolute -top-1 -left-1 ${compact ? 'h-2.5 w-2.5' : isLarger ? 'h-4 w-4' : 'h-3 w-3'}`}>
            <Users className="h-full w-full text-blue-500" />
          </div>
        )}
        
        {/* Content inside circle */}
        <div className="flex flex-col items-center justify-center text-center leading-none">
          {/* Position abbreviation above name if provided */}
          {showPositionLabel && positionAbbreviation && (
            <div className={`${textSize} font-bold mb-0.5`} style={{ color: 'rgba(184,159,255,0.9)' }}>
              {positionAbbreviation}
            </div>
          )}

          {/* Player name */}
          <div className={`${textSize} font-medium leading-tight`} style={{ color: '#fff' }}>
            {getDisplayName()}
          </div>

          {/* Squad number below */}
          {!compact && (
            <div className={`${textSize} font-bold mt-0.5`} style={{ color: 'rgba(235,235,245,0.55)' }}>
              #{player.squadNumber}
            </div>
          )}
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
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-white leading-none">C</span>
        </div>
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
