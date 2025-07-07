
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
        ${isLarger ? 'w-20 h-20' : 'w-16 h-16'}
        transition-all duration-300 ease-out
        ${isOver ? 'scale-110 z-20' : 'z-10'}
      `}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {player ? (
        <div className="relative">
          {/* Player avatar with modern styling */}
          <div className={`
            ${isLarger ? 'w-16 h-16' : 'w-14 h-14'} 
            rounded-full bg-gradient-to-br from-emerald-400 to-green-600 
            border-4 border-white shadow-lg
            flex items-center justify-center
            ${isOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}
          `}>
            <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Player name below avatar */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
            <div className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
              {player.name.split(' ')[0].toUpperCase()}
            </div>
            <div className="bg-black bg-opacity-60 text-white px-2 py-0.5 rounded-b text-xs text-center">
              #{player.squadNumber}
            </div>
          </div>
          
          {/* Captain indicator */}
          {isCaptain && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-xs font-bold text-yellow-900">C</span>
            </div>
          )}
          
          {/* Drag handle for positioned player */}
          <div className="absolute inset-0 cursor-grab" />
        </div>
      ) : (
        <div className={`
          ${isLarger ? 'w-16 h-16' : 'w-14 h-14'} 
          rounded-full border-4 border-dashed border-white
          bg-white bg-opacity-20 backdrop-blur-sm
          flex flex-col items-center justify-center text-center
          ${isOver ? 'border-solid border-blue-400 bg-blue-400 bg-opacity-30 ring-4 ring-blue-400 ring-opacity-50 scale-110' : 'hover:border-white hover:bg-white hover:bg-opacity-30'}
          transition-all duration-300 ease-out
        `}>
          <div className="text-white font-bold text-xs mb-0.5">
            {position.abbreviation}
          </div>
        </div>
      )}
    </div>
  );
};
