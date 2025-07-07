
import { useDroppable } from '@dnd-kit/core';
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
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute flex flex-col items-center justify-center
        ${isLarger ? 'w-16 h-16' : 'w-14 h-14'}
        rounded-full border-2 border-dashed
        ${isOver ? 'border-solid border-primary bg-primary/15 ring-4 ring-primary/30 scale-110 shadow-lg animate-pulse' : 'border-white/60 bg-white/20 hover:border-white/80 hover:bg-white/30'}
        transition-all duration-300 ease-out backdrop-blur-sm
      `}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {player ? (
        <PlayerIcon
          player={player}
          isCaptain={isCaptain}
          nameDisplayOption={nameDisplayOption}
          isCircular={true}
          positionAbbreviation={position.abbreviation}
          showPositionLabel={false}
          isLarger={isLarger}
          dragId={id.replace('-position-', '|position-')}
        />
      ) : (
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
