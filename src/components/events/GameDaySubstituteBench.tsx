import React from 'react';
import { useLongPress } from '@/hooks/useLongPress';

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  isUsed?: boolean;
}

interface GameDaySubstituteBenchProps {
  substitutes: SubstitutePlayer[];
  onPlayerLongPress: (playerId: string) => void;
}

export const GameDaySubstituteBench: React.FC<GameDaySubstituteBenchProps> = ({
  substitutes,
  onPlayerLongPress
}) => {
  const createLongPressHandler = (playerId: string) => {
    return useLongPress(() => {
      onPlayerLongPress(playerId);
    });
  };

  if (substitutes.length === 0) {
    return null;
  }

  return (
    <div className="substitute-bench">
      {substitutes.map((player) => {
        const longPressHandlers = createLongPressHandler(player.id);
        
        return (
          <div
            key={player.id}
            className={`substitute-card ${player.isUsed ? 'used' : ''}`}
            {...longPressHandlers}
          >
            <div className="text-lg font-bold">#{player.squad_number}</div>
            <div className="text-xs font-medium text-center line-clamp-1">
              {player.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {player.position}
            </div>
            {player.isUsed && (
              <div className="text-xs text-muted-foreground">Used</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
