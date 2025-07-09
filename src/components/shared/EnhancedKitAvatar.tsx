
import React from 'react';
import { KitDesign } from '@/types/team';

interface EnhancedKitAvatarProps {
  design: KitDesign;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const EnhancedKitAvatar: React.FC<EnhancedKitAvatarProps> = ({ 
  design, 
  size = 'sm', 
  className = '' 
}) => {
  const sizes = {
    xs: { width: 16, height: 20 },
    sm: { width: 24, height: 30 },
    md: { width: 32, height: 40 }
  };

  const { width, height } = sizes[size];

  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shirt outline with fill */}
        <path
          d="M25 30 L25 20 Q25 15 30 15 L35 15 L35 10 Q35 5 40 5 L60 5 Q65 5 65 10 L65 15 L70 15 Q75 15 75 20 L75 30 L85 35 L85 45 L75 40 L75 100 Q75 105 70 105 L30 105 Q25 105 25 100 L25 40 L15 45 L15 35 L25 30 Z"
          fill={design.shirtColor}
          stroke="currentColor"
          strokeWidth="3"
        />
        
        {/* Stripes overlay if enabled */}
        {design.hasStripes && (
          <defs>
            <pattern id={`stripes-${design.shirtColor}`} patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="4" height="8" fill={design.stripeColor} opacity="0.6" />
            </pattern>
          </defs>
        )}
        {design.hasStripes && (
          <path
            d="M25 30 L25 20 Q25 15 30 15 L35 15 L35 10 Q35 5 40 5 L60 5 Q65 5 65 10 L65 15 L70 15 Q75 15 75 20 L75 30 L85 35 L85 45 L75 40 L75 100 Q75 105 70 105 L30 105 Q25 105 25 100 L25 40 L15 45 L15 35 L25 30 Z"
            fill={`url(#stripes-${design.shirtColor})`}
          />
        )}
        
        {/* Shorts */}
        <rect
          x="35"
          y="100"
          width="30"
          height="15"
          rx="3"
          fill={design.shortsColor}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
