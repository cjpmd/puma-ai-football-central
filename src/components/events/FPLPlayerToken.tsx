import React from 'react';
import { KitShirt } from '@/components/shared/KitShirt';
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
  /** Game format — drives shirt sizing on the pitch so 11 players never overlap. */
  gameFormat?: string;
  /** Whether the viewport is mobile. */
  isMobile?: boolean;
}

/**
 * Per-format pitch token sizing.
 * Bench tokens stay constant; pitch tokens scale so 11-a-side fits without overlap
 * but smaller formats use the available space.
 */
const PITCH_SIZE_MAP: Record<string, { mobile: number; desktop: number; nameMaxWidth: number }> = {
  '4-a-side': { mobile: 56, desktop: 72, nameMaxWidth: 88 },
  '5-a-side': { mobile: 52, desktop: 68, nameMaxWidth: 84 },
  '7-a-side': { mobile: 46, desktop: 60, nameMaxWidth: 78 },
  '9-a-side': { mobile: 40, desktop: 52, nameMaxWidth: 72 },
  '11-a-side': { mobile: 36, desktop: 46, nameMaxWidth: 68 },
};
const DEFAULT_PITCH_SIZE = PITCH_SIZE_MAP['11-a-side'];
const BENCH_SIZE = 40;
const BENCH_NAME_MAX = 72;

const getDefaultShirtColor = (positionGroup: PositionGroup): string => {
  switch (positionGroup) {
    case 'goalkeeper':
      return '#facc15'; // amber
    case 'defender':
      return '#7c3aed'; // purple
    case 'midfielder':
      return '#dc2626'; // red
    case 'forward':
      return '#ef4444';
    default:
      return '#7c3aed';
  }
};

/**
 * FPL-style Player Token — shirt icon with glass name pill below.
 * Sizes dynamically by game format on the pitch.
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
  gameFormat,
  isMobile = false,
}) => {
  const isPitch = size === 'pitch';

  const sizing = isPitch
    ? PITCH_SIZE_MAP[gameFormat || ''] ?? DEFAULT_PITCH_SIZE
    : null;

  const shirtPx = isPitch
    ? (isMobile ? sizing!.mobile : sizing!.desktop)
    : BENCH_SIZE;
  const nameMaxWidth = isPitch ? sizing!.nameMaxWidth : BENCH_NAME_MAX;

  const effectiveKitDesign = positionGroup === 'goalkeeper' ? goalkeeperKitDesign : kitDesign;
  const fallbackPrimary = getDefaultShirtColor(positionGroup);

  return (
    <div className={`fpl-player-token ${className}`}>
      {/* Captain badge — purple circle, top-left */}
      {isCaptain && (
        <div className="fpl-captain-badge">
          <span>C</span>
        </div>
      )}

      {/* Shirt — driven by KitShirt with explicit pixel size */}
      {effectiveKitDesign ? (
        <KitShirt design={effectiveKitDesign} squadNumber={squadNumber} size={shirtPx} />
      ) : (
        <KitShirt primary={fallbackPrimary} squadNumber={squadNumber} size={shirtPx} />
      )}

      {/* Player name — dark glass pill (with optional position·# meta line) */}
      <div className="fpl-player-name-glass" style={{ maxWidth: nameMaxWidth }}>
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
