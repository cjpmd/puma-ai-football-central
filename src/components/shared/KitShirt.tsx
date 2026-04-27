import React, { useId } from 'react';
import { KitDesign, KitPattern, normalizeKitDesign } from '@/types/team';

export interface KitShirtProps {
  /** Shirt body fill (hex). */
  primary?: string;
  /** Sleeve / pattern accent (hex). */
  secondary?: string;
  /** Collar fill (hex). */
  collar?: string;
  /** Shirt pattern. Defaults to 'solid'. */
  pattern?: KitPattern;
  /** Squad number rendered on the shirt body. */
  squadNumber?: number | string;
  /** Render size in px (square). Drives the SVG width/height. */
  size?: number;
  /** Optional: pass a full KitDesign and we'll normalise it. Overrides individual props. */
  design?: Partial<KitDesign> | null;
  className?: string;
  /** Hides the squad number even if provided. Useful for tiny avatars. */
  hideNumber?: boolean;
}

/** Compute black/white squad number contrast from a hex fill. */
const getContrastColor = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0b0b0b' : '#ffffff';
};

/**
 * Single source of truth for shirt rendering across the app.
 * Used by Kit Designer preview, formation pitch tokens, calendar avatars
 * and any future kit visualisation.
 *
 * viewBox is 140x160 — wide-shouldered jersey with V-collar and defined sleeves.
 */
export const KitShirt: React.FC<KitShirtProps> = ({
  primary,
  secondary,
  collar,
  pattern = 'solid',
  squadNumber,
  size = 56,
  design,
  className = '',
  hideNumber = false,
}) => {
  const uid = useId().replace(/:/g, '');

  // Resolve final values — if a `design` is supplied, it wins.
  const resolved = design ? normalizeKitDesign(design) : null;
  const bodyColor = resolved?.shirtColor ?? primary ?? '#3b82f6';
  const accentColor = resolved?.stripeColor ?? secondary ?? bodyColor;
  const sleeveColor = resolved?.sleeveColor ?? secondary ?? accentColor;
  const collarColor = resolved?.collarColor ?? collar ?? '#ffffff';
  const finalPattern = (resolved?.pattern ?? pattern) as KitPattern;

  const numberColor = getContrastColor(bodyColor);
  const showNumber = !hideNumber && squadNumber !== undefined && squadNumber !== '' && squadNumber !== null;

  // Shirt body path — wide shoulders, gentle taper, defined sleeves under shoulders.
  const bodyPath =
    'M40 22 L52 14 Q70 8 88 14 L100 22 L122 36 L114 58 L102 52 L102 138 Q102 144 96 144 L44 144 Q38 144 38 138 L38 52 L26 58 L18 36 Z';

  // Pattern fill ID
  const patternId = `kit-pattern-${uid}`;
  const usePatternFill = finalPattern !== 'solid' && finalPattern !== 'halves' && finalPattern !== 'sash';
  const fillRef = usePatternFill ? `url(#${patternId})` : bodyColor;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        {finalPattern === 'stripes' && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="14" height="14">
            <rect width="14" height="14" fill={bodyColor} />
            <rect x="0" y="0" width="7" height="14" fill={accentColor} />
          </pattern>
        )}
        {finalPattern === 'hoops' && (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="14" height="14">
            <rect width="14" height="14" fill={bodyColor} />
            <rect x="0" y="0" width="14" height="7" fill={accentColor} />
          </pattern>
        )}

        {/* Clip path that locks pattern overlays to the shirt silhouette. */}
        <clipPath id={`kit-clip-${uid}`}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Shirt body */}
      <path d={bodyPath} fill={fillRef} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Halves overlay — right half painted in accent. */}
      {finalPattern === 'halves' && (
        <g clipPath={`url(#kit-clip-${uid})`}>
          <rect x="70" y="0" width="70" height="160" fill={accentColor} />
        </g>
      )}

      {/* Sash overlay — diagonal band across the chest. */}
      {finalPattern === 'sash' && (
        <g clipPath={`url(#kit-clip-${uid})`}>
          <polygon
            points="20,40 60,28 130,140 90,152"
            fill={accentColor}
          />
        </g>
      )}

      {/* Sleeve cuffs — small contrast bands at shoulder edges */}
      <path
        d="M18 36 L26 58 L34 54 L28 32 Z"
        fill={sleeveColor}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
      />
      <path
        d="M122 36 L114 58 L106 54 L112 32 Z"
        fill={sleeveColor}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
      />

      {/* V-collar */}
      <path
        d="M52 14 Q70 8 88 14 L80 30 Q70 24 60 30 Z"
        fill={collarColor}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Squad number — pill behind the digits when on a busy pattern, otherwise floating */}
      {showNumber && (
        <>
          {(finalPattern === 'stripes' || finalPattern === 'hoops') && (
            <rect
              x="52"
              y="76"
              width="36"
              height="30"
              rx="6"
              fill={bodyColor}
              opacity="0.92"
            />
          )}
          <text
            x="70"
            y="98"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="34"
            fontWeight="800"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"
            fill={(finalPattern === 'stripes' || finalPattern === 'hoops') ? getContrastColor(bodyColor) : numberColor}
          >
            {squadNumber}
          </text>
        </>
      )}
    </svg>
  );
};

export default KitShirt;
