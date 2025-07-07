
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

// Individual draggable substitute component
const DraggableSubstitute: React.FC<{
  player: SquadPlayer;
  periodId: string;
  globalCaptainId?: string;
  nameDisplayOption: 'surname' | 'first' | 'full' | 'initials';
}> = ({ player, periodId, globalCaptainId, nameDisplayOption }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `${periodId}|substitutes|${player.id}`,
    data: {
      playerId: player.id,
      sourcePeriodId: periodId,
      sourceLocation: 'substitutes'
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(1.05)`,
    zIndex: 1000,
    filter: 'brightness(1.1) drop-shadow(0 8px 16px rgba(0,0,0,0.2))',
    transition: 'none',
  } : {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'scale(1)',
    filter: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none select-none print:cursor-default ${isDragging ? 'opacity-50' : ''}`}
    >
      <PlayerIcon
        player={player}
        isCaptain={player.id === globalCaptainId}
        nameDisplayOption={nameDisplayOption}
        isCircular={true}
      />
    </div>
  );
};

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  // Extract period ID from the id prop (format: substitutes-{periodId})
  const periodId = id.replace('substitutes-', '');

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Substitutes</h4>
      <div
        ref={setNodeRef}
        className={`
          flex flex-wrap gap-2 p-3 rounded-lg border-2 border-dashed min-h-[100px]
          ${isOver ? 'border-solid border-primary bg-primary/15 ring-4 ring-primary/30 scale-[1.03] shadow-lg animate-pulse' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
          transition-all duration-300 ease-out
        `}
      >
        {substitutes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Drag players here to make them substitutes
          </div>
        ) : (
          substitutes.map((player) => (
            <DraggableSubstitute
              key={player.id}
              player={player}
              periodId={periodId}
              globalCaptainId={globalCaptainId}
              nameDisplayOption={nameDisplayOption}
            />
          ))
        )}
      </div>
    </div>
  );
};
