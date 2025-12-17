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

// Compact circular icon for each substitute - matching Formation Tab style
const SubstituteIcon: React.FC<{
  player: SubstitutePlayer;
  onLongPress: () => void;
}> = ({ player, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress);
  const firstName = player.name.split(' ')[0];
  
  return (
    <div
      className="substitute-player-icon"
      {...longPressHandlers}
    >
      {player.replacedPlayerName && (
        <div className="replaced-label">
          {player.replacedPlayerName.split(' ')[0]}
        </div>
      )}
      <span className="sub-name">{firstName}</span>
      <span className="sub-number">#{player.squad_number}</span>
    </div>
  );
};

export const GameDaySubstituteBench: React.FC<GameDaySubstituteBenchProps> = ({
  substitutes,
  onPlayerLongPress
}) => {
  if (substitutes.length === 0) {
    return (
      <div className="substitute-bench">
        <span className="substitute-bench-empty">No subs</span>
      </div>
    );
  }

  return (
    <div className="substitute-bench">
      {substitutes.map((player) => (
        <SubstituteIcon
          key={player.id}
          player={player}
          onLongPress={() => onPlayerLongPress(player.id)}
        />
      ))}
    </div>
  );
};
