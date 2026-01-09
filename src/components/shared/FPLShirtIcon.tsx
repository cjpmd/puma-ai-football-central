import React from 'react';

interface FPLShirtIconProps {
  className?: string;
}

/**
 * Clean-room FPL-style shirt silhouette.
 * Simple, flat, no collar detail, no stroke, no numbers.
 * Designed to fill ~60% of a circular container.
 */
export const FPLShirtIcon: React.FC<FPLShirtIconProps> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
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
        fill="currentColor"
      />
    </svg>
  );
};
