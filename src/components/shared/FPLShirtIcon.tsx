import React from 'react';
import { KitShirt } from './KitShirt';
import { KitPattern } from '@/types/team';

interface FPLShirtIconProps {
  className?: string;
  squadNumber?: number | string;
  shirtColor?: string;
  stripeColor?: string;
  hasStripes?: boolean;
  /** Optional size override in px (defaults to filling the container via className). */
  size?: number;
  pattern?: KitPattern;
  collarColor?: string;
  sleeveColor?: string;
}

/**
 * Backwards-compatible wrapper around the unified KitShirt component.
 * New code should import KitShirt directly.
 */
export const FPLShirtIcon: React.FC<FPLShirtIconProps> = ({
  className = '',
  squadNumber,
  shirtColor,
  stripeColor,
  hasStripes = false,
  size,
  pattern,
  collarColor,
  sleeveColor,
}) => {
  const resolvedPattern: KitPattern = pattern ?? (hasStripes ? 'stripes' : 'solid');

  return (
    <KitShirt
      className={className}
      primary={shirtColor}
      secondary={stripeColor || sleeveColor}
      collar={collarColor}
      pattern={resolvedPattern}
      squadNumber={squadNumber}
      size={size ?? 64}
    />
  );
};
