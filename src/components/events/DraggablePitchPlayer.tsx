import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PlayerShirtFallback } from '@/components/shared/PlayerShirtFallback';
import { KitDesign } from '@/types/team';
import { SquadPlayer, PositionSlot as PositionSlotType } from '@/types/teamSelection';

interface DraggablePitchPlayerProps {
  player: SquadPlayer;
  position: PositionSlotType;
  isCaptain: boolean;
  isPositionsLocked: boolean;
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
  periodId: string;
  positionIndex: number;
  nameDisplayOption?: 'surname' | 'firstName' | 'fullName' | 'initials';
}

const getPositionGroup = (positionName: string): string => {
  const pos = positionName?.toLowerCase() || '';
  if (pos.includes('keeper') || pos === 'gk') return 'goalkeeper';
  if (pos.includes('back') || pos.includes('defender') || pos === 'cb' || pos === 'lb' || pos === 'rb') return 'defender';
  if (pos.includes('mid') || pos === 'cm' || pos === 'dm' || pos === 'am') return 'midfielder';
  return 'forward';
};

const getPlayerSurname = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

export const DraggablePitchPlayer: React.FC<DraggablePitchPlayerProps> = ({
  player,
  position,
  isCaptain,
  isPositionsLocked,
  kitDesign,
  goalkeeperKitDesign,
  periodId,
  positionIndex,
}) => {
  const dragId = `${periodId}|position-${positionIndex}|${player.id}`;
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { player, type: 'pitch-player', periodId, positionIndex },
    disabled: isPositionsLocked,
  });

  const positionGroup = getPositionGroup(position.positionName);
  const isGoalkeeper = positionGroup === 'goalkeeper';

  return (
    <div
      ref={setNodeRef}
      className="absolute player-position"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      <div 
        className="player-card-enhanced"
        style={{ cursor: isPositionsLocked ? 'default' : 'grab' }}
      >
        {/* Captain Badge */}
        {isCaptain && (
          <div className="captain-badge-enhanced">
            <span>C</span>
          </div>
        )}
        
        {/* Player Image */}
        <div className="player-image-enhanced">
          {player.photo_url ? (
            <>
              <img 
                src={player.photo_url} 
                alt={player.name}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.player-shirt-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="player-shirt-fallback" style={{ display: 'none' }}>
                <PlayerShirtFallback 
                  kitDesign={kitDesign} 
                  goalkeeperKitDesign={goalkeeperKitDesign}
                  isGoalkeeper={isGoalkeeper}
                  size="sm" 
                  squadNumber={player.squadNumber} 
                />
              </div>
            </>
          ) : (
            <PlayerShirtFallback 
              kitDesign={kitDesign} 
              goalkeeperKitDesign={goalkeeperKitDesign}
              isGoalkeeper={isGoalkeeper}
              size="sm" 
              squadNumber={player.squadNumber} 
            />
          )}
        </div>
        
        {/* Name Bar */}
        <div className="player-name-bar">
          <span>{getPlayerSurname(player.name)}</span>
        </div>
      </div>
    </div>
  );
};
