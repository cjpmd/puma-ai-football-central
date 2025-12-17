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

// Separate component for each substitute player to properly use hooks
const SubstituteCard: React.FC<{
  player: SubstitutePlayer;
  onLongPress: () => void;
}> = ({ player, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress);
  const firstName = player.name.split(' ')[0];
  // Dynamic font size: smaller for longer names
  const fontSize = firstName.length <= 4 ? 14 : firstName.length <= 6 ? 12 : 10;
  
  return (
    <div
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
};

export const GameDaySubstituteBench: React.FC<GameDaySubstituteBenchProps> = ({
  substitutes,
  onPlayerLongPress
}) => {
  if (substitutes.length === 0) {
    return null;
  }

  return (
    <div className="substitute-bench">
      {substitutes.map((player) => (
        <SubstituteCard
          key={player.id}
          player={player}
          onLongPress={() => onPlayerLongPress(player.id)}
        />
      ))}
    </div>
  );
};
