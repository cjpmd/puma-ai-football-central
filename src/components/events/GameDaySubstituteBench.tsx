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

// Get player surname for display
const getPlayerSurname = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

// Enhanced substitute card
const SubstituteCard: React.FC<{
  player: SubstitutePlayer;
  onLongPress: () => void;
}> = ({ player, onLongPress }) => {
  const longPressHandlers = useLongPress(onLongPress);
  
  return (
    <div
      className="substitute-card-enhanced"
      {...longPressHandlers}
    >
      {player.replacedPlayerName && (
        <div className="replaced-label">
          {player.replacedPlayerName.split(' ')[0]}
        </div>
      )}
      
      {/* Player image */}
      <div className="sub-image-enhanced">
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
        <span className={`sub-avatar-fallback ${player.photo_url ? 'hidden' : ''}`}>
          {getPlayerInitials(player.name)}
        </span>
      </div>
      
      {/* Name Bar */}
      <div className="sub-name-bar">
        <span>{getPlayerSurname(player.name)}</span>
      </div>
      
      {/* Number Bar */}
      <div className="sub-number-bar">
        <span>{player.squad_number}</span>
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
