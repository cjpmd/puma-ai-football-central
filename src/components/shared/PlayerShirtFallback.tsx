import React from 'react';
import { KitDesign } from '@/types/team';

interface PlayerShirtFallbackProps {
  kitDesign?: KitDesign;
  size?: 'sm' | 'md';
}

export const PlayerShirtFallback: React.FC<PlayerShirtFallbackProps> = ({ 
  kitDesign,
  size = 'sm'
}) => {
  const sizes = {
    sm: { width: 36, height: 42 },
    md: { width: 44, height: 52 }
  };

  const { width, height } = sizes[size];
  
  // Default kit colors if none provided
  const shirtColor = kitDesign?.shirtColor || '#6b7280';
  const shortsColor = kitDesign?.shortsColor || '#374151';
  const stripeColor = kitDesign?.stripeColor || '#ffffff';
  const hasStripes = kitDesign?.hasStripes || false;

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shirt body */}
        <path
          d="M25 28 L25 18 Q25 13 30 13 L35 13 L35 8 Q35 3 40 3 L60 3 Q65 3 65 8 L65 13 L70 13 Q75 13 75 18 L75 28 L85 33 L85 43 L75 38 L75 90 Q75 95 70 95 L30 95 Q25 95 25 90 L25 38 L15 43 L15 33 L25 28 Z"
          fill={shirtColor}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
        />
        
        {/* Stripes overlay if enabled */}
        {hasStripes && (
          <>
            <defs>
              <pattern id="shirt-stripes" patternUnits="userSpaceOnUse" width="10" height="10">
                <rect width="5" height="10" fill={stripeColor} opacity="0.5" />
              </pattern>
            </defs>
            <path
              d="M25 28 L25 18 Q25 13 30 13 L35 13 L35 8 Q35 3 40 3 L60 3 Q65 3 65 8 L65 13 L70 13 Q75 13 75 18 L75 28 L85 33 L85 43 L75 38 L75 90 Q75 95 70 95 L30 95 Q25 95 25 90 L25 38 L15 43 L15 33 L25 28 Z"
              fill="url(#shirt-stripes)"
            />
          </>
        )}
        
        {/* Shorts */}
        <rect
          x="32"
          y="93"
          width="36"
          height="18"
          rx="3"
          fill={shortsColor}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};
