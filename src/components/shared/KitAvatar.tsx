import React from 'react';
import { KitDesign } from '@/types/team';
import { KitShirt } from './KitShirt';

interface KitAvatarProps {
  design: KitDesign;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_MAP: Record<NonNullable<KitAvatarProps['size']>, number> = {
  xs: 20,
  sm: 28,
  md: 40,
};

export const KitAvatar: React.FC<KitAvatarProps> = ({ design, size = 'sm', className = '' }) => (
  <KitShirt
    design={design}
    size={SIZE_MAP[size]}
    hideNumber
    className={className}
  />
);
