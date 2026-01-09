import React from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { FPLPlayerToken } from './FPLPlayerToken';

interface SubstitutePlayer {
  id: string;
  name: string;
  squad_number: number;
  position: string;
  isUsed?: boolean;
  replacedPlayerName?: string;
  photo_url?: string;
}

interface GameDaySubstituteBenchProps {
  substitutes: SubstitutePlayer[];
  onPlayerLongPress: (playerId: string) => void;
}

const getPositionGroup = (position: string): 'goalkeeper' | 'defender' | 'midfielder' | 'forward' => {
  const pos = position?.toLowerCase() || '';
  if (pos.includes('keeper') || pos === 'gk') return 'goalkeeper';
  if (pos.includes('back') || pos.includes('defender') || pos === 'cb' || pos === 'lb' || pos === 'rb') return 'defender';
  if (pos.includes('mid') || pos === 'cm' || pos === 'dm' || pos === 'am') return 'midfielder';
  return 'forward';
};

// Enhanced substitute card using FPL token
const SubstituteCard: React.FC<{
  player: SubstitutePlayer;
  onLongPress: () => void;
}> = ({ player, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress);
  const positionGroup = getPositionGroup(player.position);
  
  return (
    <div
      className="relative opacity-60 cursor-pointer"
      {...longPressHandlers}
    >
      {player.replacedPlayerName && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[6px] px-1 py-0.5 rounded whitespace-nowrap z-10">
          {player.replacedPlayerName.split(' ')[0]}
        </div>
      )}
      
      <FPLPlayerToken
        name={player.name}
        squadNumber={player.squad_number}
        positionGroup={positionGroup}
        size="bench"
      />
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
        <SubstituteCard
          key={player.id}
          player={player}
          onLongPress={() => onPlayerLongPress(player.id)}
        />
      ))}
    </div>
  );
};
