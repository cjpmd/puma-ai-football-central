
import { useDroppable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

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
            <div
              key={player.id}
              id={`substitutes-${id.replace('substitutes-', '')}-${player.id}`}
              className="cursor-grab active:cursor-grabbing touch-none select-none print:cursor-default"
              draggable
            >
              <PlayerIcon
                player={player}
                isCaptain={player.id === globalCaptainId}
                nameDisplayOption={nameDisplayOption}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
