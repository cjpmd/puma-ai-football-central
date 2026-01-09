import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FPLPlayerToken } from './FPLPlayerToken';
import { SquadPlayer, PositionSlot as PositionSlotType } from '@/types/teamSelection';
import { KitDesign } from '@/types/team';

interface DraggablePitchPlayerProps {
  player: SquadPlayer;
  position: PositionSlotType;
  isCaptain: boolean;
  isPositionsLocked: boolean;
  periodId: string;
  positionIndex: number;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
}

const getPositionGroup = (positionName: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
  const pos = positionName?.toLowerCase() || '';
  if (pos.includes('keeper') || pos === 'gk') return 'goalkeeper';
  if (pos.includes('back') || pos.includes('defender') || pos === 'cb' || pos === 'lb' || pos === 'rb') return 'defender';
  if (pos.includes('mid') || pos === 'cm' || pos === 'dm' || pos === 'am') return 'midfielder';
  return 'forward';
};

export const DraggablePitchPlayer: React.FC<DraggablePitchPlayerProps> = ({
  player,
  position,
  isCaptain,
  isPositionsLocked,
  periodId,
  positionIndex,
  kitDesign,
  goalkeeperKitDesign,
}) => {
  const dragId = `${periodId}|position-${positionIndex}|${player.id}`;
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { player, type: 'pitch-player', periodId, positionIndex },
    disabled: isPositionsLocked,
  });

  const positionGroup = getPositionGroup(position.positionName);

  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isDragging ? 50 : 20,
        opacity: isDragging ? 0.8 : 1,
        touchAction: 'none',
        cursor: isPositionsLocked ? 'default' : 'grab',
      }}
      {...listeners}
      {...attributes}
    >
      <FPLPlayerToken
        name={player.name}
        squadNumber={player.squadNumber}
        positionGroup={positionGroup}
        isCaptain={isCaptain}
        size="pitch"
        className={isDragging ? 'scale-105' : ''}
        kitDesign={kitDesign}
        goalkeeperKitDesign={goalkeeperKitDesign}
      />
    </div>
  );
};
