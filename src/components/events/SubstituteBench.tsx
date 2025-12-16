
import { useDroppable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  compact?: boolean;
}

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname',
  compact = false
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
    <div
      ref={setNodeRef}
      className={`
        flex flex-wrap gap-1.5 rounded-lg border-2 border-dashed
        ${compact ? 'p-2 min-h-[60px]' : 'p-3 min-h-[100px]'}
        ${isOver ? 'border-solid border-primary bg-primary/15 ring-4 ring-primary/30 shadow-lg animate-pulse' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
        transition-all duration-300 ease-out
      `}
    >
      {substitutes.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          Drag players here
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
            compact={compact}
          />
        ))
      )}
    </div>
  );
};
