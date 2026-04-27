import React from 'react';
import { KitDesign } from '@/types/team';
import { KitShirt } from './KitShirt';

interface EnhancedKitAvatarProps {
  design: KitDesign;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_MAP: Record<NonNullable<EnhancedKitAvatarProps['size']>, number> = {
  xs: 22,
  sm: 32,
  md: 44,
};

export const EnhancedKitAvatar: React.FC<EnhancedKitAvatarProps> = ({
  design,
  size = 'sm',
  className = '',
}) => (
  <KitShirt
    design={design}
    size={SIZE_MAP[size]}
    hideNumber
    className={className}
  />
);
