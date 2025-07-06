
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer, PositionSlot as PositionSlotType } from '@/types/teamSelection';

interface PositionSlotProps {
  id: string;
  position: PositionSlotType;
  player?: SquadPlayer;
  isCaptain?: boolean;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
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
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: id,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: player ? `${id.split('-position-')[0]}|position-${id.split('-position-')[1]}|${player.id}` : '',
    disabled: !player,
    data: {
      playerId: player?.id,
      sourcePeriodId: id.split('-position-')[0],
      sourceLocation: `position-${id.split('-position-')[1]}`
    }
  });

  // Enhanced transform with smooth animations and snapping
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`,
    zIndex: 1000,
    cursor: 'grabbing',
    transition: 'none',
    filter: 'brightness(1.1) drop-shadow(0 8px 16px rgba(0,0,0,0.2))',
  } : {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth snapping back
    transform: 'scale(1)',
    filter: 'none',
  };

  const getPositionGroupColor = () => {
    switch (position.positionGroup) {
      case 'goalkeeper': return 'border-yellow-400 bg-yellow-50';
      case 'defender': return 'border-blue-400 bg-blue-50';
      case 'midfielder': return 'border-green-400 bg-green-50';
      case 'forward': return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const slotSize = isLarger ? 'w-20 h-20' : 'w-16 h-16';

  return (
    <div
      ref={setDropRef}
      className="absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={`
          ${slotSize} rounded-full border-2 border-dashed flex items-center justify-center
          ${getPositionGroupColor()}
          ${isOver ? 'border-solid bg-opacity-90 scale-110 ring-4 ring-primary/40 shadow-2xl animate-pulse' : ''}
          transition-all duration-300 ease-out
          ${player ? '' : 'hover:border-solid hover:scale-105 hover:shadow-lg'}
          ${!player ? 'animate-[pulse_3s_ease-in-out_infinite] opacity-60' : ''}
        `}
      >
        {player ? (
          <div
            ref={setDragRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
              cursor-grab active:cursor-grabbing print:cursor-default 
              ${isDragging ? 'opacity-30' : 'opacity-100'} 
              touch-none select-none
              transition-all duration-150 ease-in-out
              hover:scale-105 hover:shadow-md
              active:scale-110
            `}
          >
            <PlayerIcon 
              player={player} 
              isCaptain={isCaptain}
              nameDisplayOption={nameDisplayOption}
              isCircular={true}
              positionAbbreviation={position.abbreviation}
              showPositionLabel={true}
              isLarger={isLarger}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className={`${isLarger ? 'text-sm' : 'text-xs'} font-bold text-gray-600`}>
              {position.abbreviation}
            </div>
            <div className={`${isLarger ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>
              {position.positionName.split(' ').map(word => word.slice(0, 3)).join(' ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
