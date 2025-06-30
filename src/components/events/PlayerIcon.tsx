
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { SquadPlayer } from '@/types/teamSelection';

interface PlayerIconProps {
  player: SquadPlayer;
  isDragging?: boolean;
  isCaptain?: boolean;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ 
  player, 
  isDragging = false,
  isCaptain = false,
  nameDisplayOption = 'surname'
}) => {
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
        return 'border-green-500 bg-green-50';
      case 'unavailable':
        return 'border-red-500 bg-red-50 opacity-60';
      case 'maybe':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div 
      className={`
        relative flex flex-col items-center p-2 rounded-lg border-2 min-w-[80px] max-w-[100px]
        ${getAvailabilityStyle()}
        ${isDragging ? 'shadow-lg transform rotate-2' : 'shadow-sm'}
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
      
      {/* Position indicator when positioned */}
      <div className="text-xs text-muted-foreground mt-1 opacity-75">
        {player.type === 'goalkeeper' ? 'GK' : ''}
      </div>
    </div>
  );
};
