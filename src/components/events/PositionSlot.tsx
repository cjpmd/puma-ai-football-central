
import { useDroppable } from '@dnd-kit/core';
import { SquadPlayer, PositionSlot as PositionSlotType } from '@/types/teamSelection';

interface PositionSlotProps {
  id: string;
  position: PositionSlotType;
  player?: SquadPlayer;
  isCaptain?: boolean;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  isLarger?: boolean;
}

export const PositionSlot: React.FC<PositionSlotProps> = ({
  id,
  position,
  player,
  isCaptain = false,
  nameDisplayOption = 'surname',
  isLarger = false
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: {
      type: 'position',
      position: position
    }
  });

  // Helper function to get position group color
  const getPositionGroupColor = (position: string) => {
    const pos = position?.toLowerCase() || '';
    
    if (pos.includes('gk') || pos.includes('goalkeeper')) {
      return 'border-yellow-400 bg-yellow-50';
    } else if (pos.includes('cb') || pos.includes('lb') || pos.includes('rb') || 
               pos.includes('wb') || pos.includes('def') || pos.includes('dl') || 
               pos.includes('dr') || pos.includes('dc')) {
      return 'border-blue-400 bg-blue-50';
    } else if (pos.includes('cm') || pos.includes('dm') || pos.includes('am') || 
               pos.includes('mid') || pos.includes('ml') || pos.includes('mr') || 
               pos.includes('mc') || pos.includes('cdm') || pos.includes('cam')) {
      return 'border-green-400 bg-green-50';
    } else {
      // Forwards/Attackers
      return 'border-red-400 bg-red-50';
    }
  };

  const positionGroupColor = getPositionGroupColor(position.positionName || position.abbreviation || '');

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute flex flex-col items-center justify-center
        ${isLarger ? 'w-20 h-20' : 'w-16 h-16'}
        rounded-full border-2 border-dashed
        ${isOver ? 'border-solid border-primary bg-primary/15 ring-4 ring-primary/30 shadow-lg' : 
          (player ? 'border-transparent bg-transparent' : 'border-white/60 bg-white/20 hover:border-white/80 hover:bg-white/30')}
        transition-all duration-300 ease-out backdrop-blur-sm
      `}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {player ? null : (
        <div className="flex flex-col items-center justify-center text-center">
          <div className={`${isLarger ? 'text-xs' : 'text-xs'} font-bold text-white/80 mb-1`}>
            {position.abbreviation}
          </div>
          <div className={`${isLarger ? 'text-xs' : 'text-xs'} text-white/60`}>
            {position.positionName}
          </div>
        </div>
      )}
    </div>
  );
};
