
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
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
  } : {};

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
          ${isOver ? 'border-solid border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02]' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}
          transition-all duration-200 ease-in-out
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
