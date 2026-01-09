import React from 'react';
import { FPLShirtIcon } from '@/components/shared/FPLShirtIcon';
import { KitDesign } from '@/types/team';

type PositionGroup = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type TokenSize = 'pitch' | 'bench';

interface FPLPlayerTokenProps {
  name: string;
  squadNumber?: number | string;
  positionGroup: PositionGroup;
  isCaptain?: boolean;
  size?: TokenSize;
  className?: string;
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
}

/**
 * Get default position-based shirt color (fallback if no kit design)
 */
const getDefaultShirtColor = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return '#facc15'; // yellow-400
    case 'defender':
      return '#2563eb'; // blue-600
    case 'midfielder':
      return '#16a34a'; // green-600
    case 'forward':
      return '#dc2626'; // red-600
    default:
      return '#16a34a';
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
 * - Shirt icon filling ~80% of circle
 * - Surname label below
 * - Position-colored number strip
 * - Captain badge (optional)
 * - Uses actual kit design colors when provided
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
  kitDesign,
  goalkeeperKitDesign,
}) => {
  const isPitch = size === 'pitch';
  const circleSize = isPitch ? 'w-14 h-14' : 'w-11 h-11'; // 56px vs 44px
  // Increased shirt size to fill ~80% of circle
  const shirtSize = isPitch ? 'w-11 h-11' : 'w-[34px] h-[34px]'; // 44px vs 34px
  const nameSize = isPitch ? 'text-[11px]' : 'text-[10px]';
  const stripSize = isPitch ? 'text-[10px] px-2 py-0.5' : 'text-[9px] px-1.5 py-0.5';
  
  // Determine shirt color from kit design or fall back to position-based color
  const effectiveKitDesign = positionGroup === 'goalkeeper' ? goalkeeperKitDesign : kitDesign;
  const shirtBgColor = effectiveKitDesign?.shirtColor || getDefaultShirtColor(positionGroup);
  
  const numberStripClass = getNumberStripClass(positionGroup);

  return (
    <div className={`fpl-player-token ${className}`}>
      {/* Captain Badge */}
      {isCaptain && (
        <div className="fpl-captain-badge">
          <span>C</span>
        </div>
      )}
      
      {/* Shirt Circle - using inline style for kit color */}
      <div 
        className={`fpl-shirt-circle ${circleSize}`}
        style={{ backgroundColor: shirtBgColor }}
      >
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
