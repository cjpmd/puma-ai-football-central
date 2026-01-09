import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { FPLPlayerToken } from './FPLPlayerToken';
import { SquadPlayer } from '@/types/teamSelection';
import { KitDesign } from '@/types/team';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  compact?: boolean;
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
}

const getPositionGroupFromType = (type?: 'goalkeeper' | 'outfield'): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
  if (type === 'goalkeeper') return 'goalkeeper';
  // Default outfield players to midfielder for bench display
  return 'midfielder';
};

// Draggable substitute player component
const DraggableSubstitutePlayer: React.FC<{
  player: SquadPlayer;
  periodId: string;
  isCaptain: boolean;
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
}> = ({ player, periodId, isCaptain, kitDesign, goalkeeperKitDesign }) => {
  const dragId = `${periodId}|substitutes|${player.id}`;
  const positionGroup = getPositionGroupFromType(player.type);
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { player, type: 'substitute' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`cursor-grab touch-none ${isDragging ? 'opacity-50 scale-105' : ''}`}
      style={{ touchAction: 'none' }}
      {...listeners}
      {...attributes}
    >
      <FPLPlayerToken
        name={player.name}
        squadNumber={player.squadNumber}
        positionGroup={positionGroup}
        isCaptain={isCaptain}
        size="bench"
        kitDesign={kitDesign}
        goalkeeperKitDesign={goalkeeperKitDesign}
      />
    </div>
  );
};

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname',
  compact = false,
  kitDesign,
  goalkeeperKitDesign,
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
        flex flex-wrap gap-1 rounded-lg border-2 border-dashed
        ${compact ? 'p-1 min-h-[50px]' : 'p-3 min-h-[100px]'}
        ${isOver ? 'border-solid border-primary bg-primary/15 ring-4 ring-primary/30 shadow-lg animate-pulse' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
        transition-all duration-300 ease-out
      `}
    >
      {substitutes.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-gray-500 ${compact ? 'text-[9px]' : 'text-sm'}`}>
          Drag players here
        </div>
      ) : (
        substitutes.map((player) => (
          <DraggableSubstitutePlayer
            key={player.id}
            player={player}
            periodId={periodId}
            isCaptain={player.id === globalCaptainId}
            kitDesign={kitDesign}
            goalkeeperKitDesign={goalkeeperKitDesign}
          />
        ))
      )}
    </div>
  );
};
