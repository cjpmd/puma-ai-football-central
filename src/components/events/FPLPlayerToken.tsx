import React from 'react';
import { FPLShirtIcon } from '@/components/shared/FPLShirtIcon';

type PositionGroup = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type TokenSize = 'pitch' | 'bench';

interface FPLPlayerTokenProps {
  name: string;
  squadNumber?: number | string;
  positionGroup: PositionGroup;
  isCaptain?: boolean;
  size?: TokenSize;
  className?: string;
  /** Optional: Override the shirt color with a Tailwind bg class */
  shirtColorClass?: string;
}

/**
 * Get the position-based shirt color class
 */
const getShirtColor = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return 'bg-yellow-400';
    case 'defender':
      return 'bg-blue-600';
    case 'midfielder':
      return 'bg-green-600';
    case 'forward':
      return 'bg-red-600';
    default:
      return 'bg-green-600';
  }
};

/**
 * Get the position-based number strip gradient class
 */
const getNumberStripClass = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return 'fpl-number-strip-gk';
    case 'defender':
      return 'fpl-number-strip-def';
    case 'midfielder':
      return 'fpl-number-strip-mid';
    case 'forward':
      return 'fpl-number-strip-fwd';
    default:
      return 'fpl-number-strip-mid';
  }
};

/**
 * Extract surname from full name
 */
const getSurname = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

/**
 * FPL-style Player Token Component
 * 
 * Circular token with:
 * - Shirt icon (60% of circle)
 * - Surname label below
 * - Position-colored number strip
 * - Captain badge (optional)
 * 
 * NO shadows, NO borders, NO card containers.
 */
export const FPLPlayerToken: React.FC<FPLPlayerTokenProps> = ({
  name,
  squadNumber,
  positionGroup,
  isCaptain = false,
  size = 'pitch',
  className = '',
  shirtColorClass,
}) => {
  const isPitch = size === 'pitch';
  const circleSize = isPitch ? 'w-14 h-14' : 'w-11 h-11'; // 56px vs 44px
  const shirtSize = isPitch ? 'w-8 h-8' : 'w-6 h-6'; // 32px vs 24px (~60%)
  const nameSize = isPitch ? 'text-[11px]' : 'text-[10px]';
  const stripSize = isPitch ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  
  const shirtColor = shirtColorClass || getShirtColor(positionGroup);
  const numberStripClass = getNumberStripClass(positionGroup);

  return (
    <div className={`fpl-player-token ${className}`}>
      {/* Captain Badge */}
      {isCaptain && (
        <div className="fpl-captain-badge">
          <span>C</span>
        </div>
      )}
      
      {/* Shirt Circle */}
      <div className={`fpl-shirt-circle ${circleSize} ${shirtColor}`}>
        <FPLShirtIcon className={`${shirtSize} text-white/90`} />
      </div>

      {/* Player Surname */}
      <div className={`fpl-player-name ${nameSize}`}>
        {getSurname(name)}
      </div>

      {/* Number Strip */}
      {squadNumber !== undefined && (
        <div className={`fpl-number-strip ${numberStripClass} ${stripSize}`}>
          {squadNumber}
        </div>
      )}
    </div>
  );
};

/**
 * Bench variant with muted appearance
 */
export const FPLBenchToken: React.FC<FPLPlayerTokenProps> = (props) => {
  return (
    <div className="opacity-60">
      <FPLPlayerToken {...props} size="bench" />
    </div>
  );
};
