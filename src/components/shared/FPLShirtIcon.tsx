import React from 'react';

interface FPLShirtIconProps {
  className?: string;
  squadNumber?: number | string;
  shirtColor?: string;
  stripeColor?: string;
  hasStripes?: boolean;
}

/**
 * FPL-style shirt icon with squad number displayed on the shirt.
 * Supports solid colors and vertical stripes.
 */
export const FPLShirtIcon: React.FC<FPLShirtIconProps> = ({ 
  className = "",
  squadNumber,
  shirtColor = "#16a34a",
  stripeColor,
  hasStripes = false,
}) => {
  const patternId = `stripe-pattern-${squadNumber || 'default'}`;
  
  // Determine text color based on shirt brightness
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const textColor = hasStripes 
    ? getContrastColor(shirtColor || '#16a34a')
    : getContrastColor(shirtColor || '#16a34a');

  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Define stripe pattern if needed */}
      {hasStripes && stripeColor && (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="8"
            height="64"
          >
            <rect x="0" y="0" width="4" height="64" fill={shirtColor} />
            <rect x="4" y="0" width="4" height="64" fill={stripeColor} />
          </pattern>
        </defs>
      )}
      
      {/* Shirt shape */}
      <path
        d="
          M18 12
          L10 18
          C8 20 8 24 10 26
          L16 32
          L16 52
          C16 54 18 56 20 56
          L44 56
          C46 56 48 54 48 52
          L48 32
          L54 26
          C56 24 56 20 54 18
          L46 12
          Z
        "
        fill={hasStripes && stripeColor ? `url(#${patternId})` : shirtColor}
      />
      
      {/* Squad number on shirt */}
      {squadNumber !== undefined && (
        <text
          x="32"
          y="40"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize="18"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          style={{ 
            textShadow: hasStripes ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {squadNumber}
        </text>
      )}
    </svg>
  );
};
