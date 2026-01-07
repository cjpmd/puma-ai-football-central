import React from 'react';
import { useLongPress } from '@/hooks/useLongPress';

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

const getPlayerInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Fantasy-style substitute card
const SubstituteCard: React.FC<{
  player: SubstitutePlayer;
  onLongPress: () => void;
}> = ({ player, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress);
  const firstName = player.name.split(' ')[0];
  
  return (
    <div
      className="substitute-card-fantasy"
      {...longPressHandlers}
    >
      {player.replacedPlayerName && (
        <div className="replaced-label">
          {player.replacedPlayerName.split(' ')[0]}
        </div>
      )}
      
      {/* Mini player image */}
      <div className="sub-image-mini">
        {player.photo_url ? (
          <img 
            src={player.photo_url} 
            alt={player.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`sub-avatar-fallback ${player.photo_url ? 'hidden' : ''}`}>
          {getPlayerInitials(player.name)}
        </div>
      </div>
      
      {/* Mini info card */}
      <div className="sub-info-mini">
        <span className="sub-name-mini">{firstName}</span>
        <span className="sub-number-mini">#{player.squad_number}</span>
      </div>
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
