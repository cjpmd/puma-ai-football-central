import React from 'react';
import { KitDesign } from '@/types/team';

interface PlayerShirtFallbackProps {
  kitDesign?: KitDesign;
  size?: 'sm' | 'md';
  squadNumber?: number | string;
}

export const PlayerShirtFallback: React.FC<PlayerShirtFallbackProps> = ({ 
  kitDesign,
  size = 'sm',
  squadNumber
}) => {
  const sizes = {
    sm: { width: 40, height: 44 },
    md: { width: 52, height: 56 }
  };

  const { width, height } = sizes[size];
  
  // Default kit colors if none provided
  const shirtColor = kitDesign?.shirtColor || '#ffffff';
  const accentColor = kitDesign?.sleeveColor || kitDesign?.stripeColor || '#dc2626';
  const stripeColor = kitDesign?.stripeColor || '#1a1a1a';
  const hasStripes = kitDesign?.hasStripes || false;

  // Determine text color based on shirt brightness
  const getContrastColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#1a1a1a' : '#ffffff';
  };

  const numberColor = getContrastColor(shirtColor);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shirt body - back view silhouette */}
        <path
          d="M15 25 L15 15 Q15 8 25 8 L35 8 L38 3 Q42 0 50 0 Q58 0 62 3 L65 8 L75 8 Q85 8 85 15 L85 25 L95 30 L95 42 L85 37 L85 85 Q85 88 82 88 L18 88 Q15 88 15 85 L15 37 L5 42 L5 30 L15 25 Z"
          fill={shirtColor}
          stroke="#1a1a1a"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Collar accent */}
        <path
          d="M38 3 Q42 0 50 0 Q58 0 62 3"
          fill="none"
          stroke={accentColor}
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        {/* Left sleeve cuff */}
        <rect
          x="5"
          y="30"
          width="12"
          height="5"
          fill={accentColor}
        />
        
        {/* Right sleeve cuff */}
        <rect
          x="83"
          y="30"
          width="12"
          height="5"
          fill={accentColor}
        />
        
        {/* Vertical stripes on bottom portion */}
        {hasStripes && (
          <>
            <rect x="25" y="55" width="6" height="30" fill={stripeColor} opacity="0.7" />
            <rect x="37" y="55" width="6" height="30" fill={stripeColor} opacity="0.7" />
            <rect x="57" y="55" width="6" height="30" fill={stripeColor} opacity="0.7" />
            <rect x="69" y="55" width="6" height="30" fill={stripeColor} opacity="0.7" />
          </>
        )}

        {/* Squad Number */}
        {squadNumber && (
          <text
            x="50"
            y="48"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={numberColor}
            fontSize="34"
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            {squadNumber}
          </text>
        )}
      </svg>
    </div>
  );
};
