
import { useDroppable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
}

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
    data: {
      type: 'substitutes'
    }
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
            <PlayerIcon
              key={player.id}
              player={player}
              isCaptain={player.id === globalCaptainId}
              nameDisplayOption={nameDisplayOption}
              isCircular={true}
              dragId={`${periodId}|substitutes|${player.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
};
