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
 * Extract surname from full name
 */
const getSurname = (name: string): string => {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

/**
 * FPL-style Player Token Component
 * 
 * Features:
 * - Shirt icon with squad number displayed ON the shirt
 * - Surname label below
 * - Uses actual kit design colors including stripes
 * - Captain badge (optional)
 * 
 * NO number strip below - number is on the shirt itself.
 */
/**
 * Get circle background color based on position
 */
const getCircleBackground = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return 'bg-yellow-500/20';
    case 'defender':
      return 'bg-blue-500/20';
    case 'midfielder':
      return 'bg-green-500/20';
    case 'forward':
      return 'bg-red-500/20';
    default:
      return 'bg-green-500/20';
  }
};

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
  const containerSize = isPitch ? 'w-14 h-14' : 'w-11 h-11';
  const shirtSize = isPitch ? 'w-12 h-12' : 'w-10 h-10';
  const nameSize = isPitch ? 'text-[11px]' : 'text-[10px]';
  
  // Determine which kit to use based on position
  const effectiveKitDesign = positionGroup === 'goalkeeper' ? goalkeeperKitDesign : kitDesign;
  const shirtColor = effectiveKitDesign?.shirtColor || getDefaultShirtColor(positionGroup);
  const stripeColor = effectiveKitDesign?.stripeColor;
  const hasStripes = effectiveKitDesign?.hasStripes || false;
  
  // Get circle background color
  const circleBackground = getCircleBackground(positionGroup);

  return (
    <div className={`fpl-player-token ${className}`}>
      {/* Captain Badge */}
      {isCaptain && (
        <div className="fpl-captain-badge">
          <span>C</span>
        </div>
      )}
      
      {/* Shirt Container with circle background */}
      <div className={`fpl-shirt-circle ${containerSize} ${circleBackground}`}>
        <FPLShirtIcon 
          className={shirtSize}
          squadNumber={squadNumber}
          shirtColor={shirtColor}
          stripeColor={stripeColor}
          hasStripes={hasStripes}
        />
      </div>

      {/* Player Surname */}
      <div className={`fpl-player-name ${nameSize}`}>
        {getSurname(name)}
      </div>
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
