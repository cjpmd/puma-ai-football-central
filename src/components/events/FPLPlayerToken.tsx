import React from 'react';
import { FPLShirtIcon } from '@/components/shared/FPLShirtIcon';
import { KitDesign, NameDisplayOption } from '@/types/team';
import { formatPlayerName } from '@/utils/nameUtils';

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
  nameDisplayOption?: NameDisplayOption;
  /** Position abbreviation rendered as a muted secondary line under the name (e.g. "DC · 4") */
  positionAbbr?: string;
}

const getDefaultShirtColor = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return 'oklch(0.75 0.16 80)';  // amber
    case 'defender':
      return 'oklch(0.55 0.18 270)'; // purple
    case 'midfielder':
      return 'oklch(0.55 0.20 25)';  // magenta-red
    case 'forward':
      return 'oklch(0.62 0.22 25)';  // red
    default:
      return 'oklch(0.55 0.18 270)';
  }
};

/**
 * FPL-style Player Token — shirt icon with glass name pill below.
 * Design based on Formation.html (Origin Sports iOS design bundle).
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
  nameDisplayOption = 'surname',
  positionAbbr,
}) => {
  const isPitch = size === 'pitch';
  const shirtSize = isPitch ? 'w-11 h-11' : 'w-9 h-9';

  const effectiveKitDesign = positionGroup === 'goalkeeper' ? goalkeeperKitDesign : kitDesign;
  const shirtColor = effectiveKitDesign?.shirtColor || getDefaultShirtColor(positionGroup);
  const stripeColor = effectiveKitDesign?.stripeColor;
  const hasStripes = effectiveKitDesign?.hasStripes || false;

  return (
    <div className={`fpl-player-token ${className}`}>
      {/* Captain badge — purple circle, top-left */}
      {isCaptain && (
        <div className="fpl-captain-badge">
          <span>C</span>
        </div>
      )}

      {/* Shirt — no circle container, shown directly */}
      <FPLShirtIcon
        className={shirtSize}
        squadNumber={squadNumber}
        shirtColor={shirtColor}
        stripeColor={stripeColor}
        hasStripes={hasStripes}
      />

      {/* Player name — dark glass pill (with optional position·# meta line) */}
      <div className="fpl-player-name-glass">
        <div>{formatPlayerName(name, nameDisplayOption)}</div>
        {positionAbbr && (
          <div className="fpl-player-meta-line">
            {positionAbbr}
            {squadNumber !== undefined && squadNumber !== '' && ` · ${squadNumber}`}
          </div>
        )}
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
