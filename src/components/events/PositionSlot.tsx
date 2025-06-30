
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
}

export const PositionSlot: React.FC<PositionSlotProps> = ({
  id,
  position,
  player,
  isCaptain = false,
  nameDisplayOption = 'surname'
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
    id: player?.id || '',
    disabled: !player,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getPositionGroupColor = () => {
    switch (position.positionGroup) {
      case 'goalkeeper': return 'border-yellow-400 bg-yellow-50';
      case 'defender': return 'border-blue-400 bg-blue-50';
      case 'midfielder': return 'border-green-400 bg-green-50';
      case 'forward': return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

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
          w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center
          ${getPositionGroupColor()}
          ${isOver ? 'border-solid bg-opacity-75 scale-110' : ''}
          transition-all duration-200
        `}
      >
        {player ? (
          <div
            ref={setDragRef}
            style={style}
            {...listeners}
            {...attributes}
            className={isDragging ? 'opacity-50' : ''}
          >
            <PlayerIcon 
              player={player} 
              isCaptain={isCaptain}
              nameDisplayOption={nameDisplayOption}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs font-bold text-gray-600">
              {position.abbreviation}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {position.positionName.split(' ').map(word => word.slice(0, 3)).join(' ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
