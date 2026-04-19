import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { FPLPlayerToken } from './FPLPlayerToken';
import { SquadPlayer } from '@/types/teamSelection';
import { KitDesign, NameDisplayOption } from '@/types/team';

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
  nameDisplayOption?: NameDisplayOption;
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
}> = ({ player, periodId, isCaptain, nameDisplayOption = 'surname', kitDesign, goalkeeperKitDesign }) => {
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
        nameDisplayOption={nameDisplayOption}
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
        flex flex-wrap gap-1 rounded-xl border
        ${compact ? 'p-1 min-h-[50px]' : 'p-3 min-h-[100px]'}
        ${isOver
          ? 'border-purple-400 ring-2 ring-purple-400/30 animate-pulse'
          : 'border-white/10 hover:border-white/20'}
        transition-all duration-300 ease-out
      `}
      style={{
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        background: isOver ? 'rgba(124,77,232,0.18)' : 'rgba(20,10,36,0.55)',
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {substitutes.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center ${compact ? 'text-[9px]' : 'text-sm'}`} style={{ color: 'rgba(235,235,245,0.45)' }}>
          Drag players here
        </div>
      ) : (
        substitutes.map((player) => (
          <DraggableSubstitutePlayer
            key={player.id}
            player={player}
            periodId={periodId}
            isCaptain={player.id === globalCaptainId}
            nameDisplayOption={nameDisplayOption}
            kitDesign={kitDesign}
            goalkeeperKitDesign={goalkeeperKitDesign}
          />
        ))
      )}
    </div>
  );
};
