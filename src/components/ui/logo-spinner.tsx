import React from 'react';
import { cn } from '@/lib/utils';

interface LogoSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LogoSpinner: React.FC<LogoSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
    >
      <style>{`
        @keyframes lp-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .lp-rotor {
          transform-origin: 80px 92px;
          animation: lp-spin 1.4s linear infinite;
        }
      `}</style>

      <defs>
        <linearGradient id="lp-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9C2F6" />
          <stop offset="100%" stopColor="#8B5BD1" />
        </linearGradient>
      </defs>

      {/* Static crown / button */}
      <rect x="70" y="14" width="20" height="10" rx="3" fill="url(#lp-grad)" />
      <rect x="74" y="6" width="12" height="10" rx="2" fill="url(#lp-grad)" />

      {/* Static background ring */}
      <circle
        cx="80"
        cy="92"
        r="56"
        stroke="#D9C2F6"
        strokeOpacity="0.25"
        strokeWidth="10"
        fill="none"
      />

      {/* Rotating chasing arc + hand */}
      <g className="lp-rotor">
        <circle
          cx="80"
          cy="92"
          r="56"
          stroke="url(#lp-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="100 252"
          fill="none"
        />
        <line
          x1="80"
          y1="92"
          x2="80"
          y2="48"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>

      {/* Hub */}
      <circle cx="80" cy="92" r="6" fill="#FFFFFF" />
    </svg>
  );
};
