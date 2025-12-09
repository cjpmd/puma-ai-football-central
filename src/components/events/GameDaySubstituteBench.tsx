import React from 'react';
import { useLongPress } from '@/hooks/useLongPress';

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  isUsed?: boolean;
  replacedPlayerName?: string;
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
        const firstName = player.name.split(' ')[0];
        // Dynamic font size: smaller for longer names
        const fontSize = firstName.length <= 4 ? 14 : firstName.length <= 6 ? 12 : 10;
        
        return (
          <div
            key={player.id}
            className={`substitute-card ${player.isUsed ? 'used' : ''}`}
            {...longPressHandlers}
          >
            {player.replacedPlayerName && (
              <div className="replaced-by-label">
                {player.replacedPlayerName.split(' ')[0]}
              </div>
            )}
            <div className="player-circle">
              <div className="player-name-in-circle" style={{ fontSize: `${fontSize}px` }}>
                {firstName}
              </div>
            </div>
            <div className="substitute-number">#{player.squad_number}</div>
            <div className="substitute-position">{player.position}</div>
            {player.isUsed && (
              <div className="text-[9px] text-green-600 dark:text-green-400 font-medium">Available</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
