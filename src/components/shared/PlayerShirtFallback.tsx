import React from 'react';
import { KitDesign } from '@/types/team';
import { KitShirt } from './KitShirt';

interface PlayerShirtFallbackProps {
  kitDesign?: KitDesign;
  goalkeeperKitDesign?: KitDesign;
  isGoalkeeper?: boolean;
  size?: 'sm' | 'md';
  squadNumber?: number | string;
}

const SIZE_MAP: Record<NonNullable<PlayerShirtFallbackProps['size']>, number> = {
  sm: 44,
  md: 60,
};

/**
 * Fallback shirt rendered when a player has no photo.
 * Always picks the goalkeeper kit when isGoalkeeper is true and a GK kit exists.
 */
export const PlayerShirtFallback: React.FC<PlayerShirtFallbackProps> = ({
  kitDesign,
  goalkeeperKitDesign,
  isGoalkeeper = false,
  size = 'sm',
  squadNumber,
}) => {
  const activeKit = isGoalkeeper ? (goalkeeperKitDesign || kitDesign) : kitDesign;

  // Sensible goalkeeper default when no kit is configured.
  const fallbackPrimary = isGoalkeeper ? '#facc15' : '#ffffff';
  const fallbackAccent = isGoalkeeper ? '#1a1a1a' : '#dc2626';

  return (
    <div className="flex items-center justify-center w-full h-full">
      {activeKit ? (
        <KitShirt design={activeKit} squadNumber={squadNumber} size={SIZE_MAP[size]} />
      ) : (
        <KitShirt
          primary={fallbackPrimary}
          secondary={fallbackAccent}
          squadNumber={squadNumber}
          size={SIZE_MAP[size]}
        />
      )}
    </div>
  );
};
