import React from 'react';
import { KitDesign } from '@/types/team';

interface KitAvatarProps {
  design: KitDesign;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const KitAvatar: React.FC<KitAvatarProps> = ({ 
  design, 
  size = 'sm', 
  className = '' 
}) => {
  const sizes = {
    xs: { container: 'w-4 h-5', shirt: 'w-3 h-4', shorts: 'w-2 h-1' },
    sm: { container: 'w-6 h-8', shirt: 'w-5 h-6', shorts: 'w-3 h-1.5' },
    md: { container: 'w-8 h-10', shirt: 'w-7 h-8', shorts: 'w-4 h-2' }
  };

  const { container, shirt, shorts } = sizes[size];

  return (
    <div className={`${container} flex flex-col items-center justify-center ${className}`}>
      {/* Shirt */}
      <div 
        className={`${shirt} rounded-t-sm border relative overflow-hidden`}
        style={{
          backgroundColor: design.shirtColor,
          border: design.shirtColor === '#ffffff' ? '1px solid #e5e7eb' : '0.5px solid #9ca3af'
        }}
      >
        {/* Stripes overlay */}
        {design.hasStripes && (
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent,
                transparent 2px,
                ${design.stripeColor} 2px,
                ${design.stripeColor} 3px
              )`
            }}
          />
        )}
      </div>
      
      {/* Shorts */}
      <div 
        className={`${shorts} rounded-sm`}
        style={{
          backgroundColor: design.shortsColor,
          border: design.shortsColor === '#ffffff' ? '1px solid #e5e7eb' : 'none'
        }}
      />
    </div>
  );
};