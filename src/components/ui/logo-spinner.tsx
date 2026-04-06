import React from 'react';
import { cn } from '@/lib/utils';

interface LogoSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LogoSpinner: React.FC<LogoSpinnerProps> = ({
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @keyframes lp-draw {
          0%   { stroke-dashoffset: var(--d); }
          40%  { stroke-dashoffset: 0; }
          60%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: var(--d); }
        }
        .lp {
          fill: none;
          stroke: #00C440;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: var(--d);
          animation: lp-draw 2s ease-in-out infinite;
        }
      `}</style>

      {/* Outer silhouette — head outline with ear tufts */}
      <path className="lp"
        style={{ '--d': '320', animationDelay: '0s' } as React.CSSProperties}
        d="M50,8 L66,14 L82,2 L90,20 L94,40 L92,56 L82,72 L68,84 L56,92 L50,94
           L44,92 L32,84 L18,72 L8,56 L6,40 L10,20 L18,2 L34,14 Z"
      />

      {/* Crown — top pentagon between ears */}
      <path className="lp"
        style={{ '--d': '100', animationDelay: '0.1s' } as React.CSSProperties}
        d="M34,14 L50,8 L66,14 L62,26 L38,26 Z"
      />

      {/* Left ear triangle */}
      <path className="lp"
        style={{ '--d': '55', animationDelay: '0.15s' } as React.CSSProperties}
        d="M34,14 L18,2 L10,20"
      />

      {/* Right ear triangle */}
      <path className="lp"
        style={{ '--d': '55', animationDelay: '0.15s' } as React.CSSProperties}
        d="M66,14 L82,2 L90,20"
      />

      {/* Left forehead facet — outer ear base to brow */}
      <path className="lp"
        style={{ '--d': '50', animationDelay: '0.2s' } as React.CSSProperties}
        d="M38,26 L10,20 L22,38"
      />

      {/* Right forehead facet */}
      <path className="lp"
        style={{ '--d': '50', animationDelay: '0.2s' } as React.CSSProperties}
        d="M62,26 L90,20 L78,38"
      />

      {/* Left inner forehead lines — crown to nose bridge */}
      <path className="lp"
        style={{ '--d': '40', animationDelay: '0.3s' } as React.CSSProperties}
        d="M38,26 L44,34 L50,28"
      />

      {/* Right inner forehead lines */}
      <path className="lp"
        style={{ '--d': '40', animationDelay: '0.3s' } as React.CSSProperties}
        d="M62,26 L56,34 L50,28"
      />

      {/* Left eye diamond */}
      <path className="lp"
        style={{ '--d': '60', animationDelay: '0.4s' } as React.CSSProperties}
        d="M22,38 L34,28 L44,34 L34,46 Z"
      />

      {/* Right eye diamond */}
      <path className="lp"
        style={{ '--d': '60', animationDelay: '0.4s' } as React.CSSProperties}
        d="M78,38 L66,28 L56,34 L66,46 Z"
      />

      {/* Nose bridge diamond — vertical from brow to muzzle */}
      <path className="lp"
        style={{ '--d': '80', animationDelay: '0.5s' } as React.CSSProperties}
        d="M50,28 L44,50 L50,60 L56,50 Z"
      />

      {/* Left cheek lines — eye to jaw + inner to nose */}
      <path className="lp"
        style={{ '--d': '48', animationDelay: '0.6s' } as React.CSSProperties}
        d="M34,46 L18,62 M44,34 L44,50"
      />

      {/* Right cheek lines */}
      <path className="lp"
        style={{ '--d': '48', animationDelay: '0.6s' } as React.CSSProperties}
        d="M66,46 L82,62 M56,34 L56,50"
      />

      {/* Left side face line */}
      <path className="lp"
        style={{ '--d': '35', animationDelay: '0.55s' } as React.CSSProperties}
        d="M22,38 L8,56 L18,62"
      />

      {/* Right side face line */}
      <path className="lp"
        style={{ '--d': '35', animationDelay: '0.55s' } as React.CSSProperties}
        d="M78,38 L92,56 L82,62"
      />

      {/* Muzzle W-band — whisker pad edges */}
      <path className="lp"
        style={{ '--d': '80', animationDelay: '0.7s' } as React.CSSProperties}
        d="M18,62 L38,66 L44,60 L50,60 L56,60 L62,66 L82,62"
      />

      {/* Lower jaw & chin details */}
      <path className="lp"
        style={{ '--d': '120', animationDelay: '0.8s' } as React.CSSProperties}
        d="M38,66 L34,78 L50,86 L66,78 L62,66
           M34,78 L32,84
           M66,78 L68,84
           M50,86 L50,94
           M18,62 L18,72
           M82,62 L82,72"
      />
    </svg>
  );
};
