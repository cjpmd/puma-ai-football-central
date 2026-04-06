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

  // Each path declares --d (stroke length) and an animation-delay via inline style.
  // The keyframe cycles: invisible → draw in (0-40%) → hold (40-60%) → erase (60-100%) → repeat.
  // All paths share the same 2 s period but have staggered phase offsets, so the
  // draw "wave" propagates continuously from the outer boundary inward to the chin.

  return (
    <svg
      className={cn(sizeClasses[size], className)}
      viewBox="0 0 100 96"
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
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: var(--d);
          animation: lp-draw 2s ease-in-out infinite;
        }
      `}</style>

      {/* 1. Outer silhouette — complete head boundary including both ear spikes */}
      <path className="lp"
        style={{ '--d': '340', animationDelay: '0s' } as React.CSSProperties}
        d="M50,7 L69,13 L84,1 L93,22 L96,43 L95,58 L83,75 L67,89 L54,95 L50,96
           L46,95 L33,89 L17,75 L5,58 L4,43 L7,22 L16,1 L31,13 Z"
      />

      {/* 2. Crown pentagon — top-of-skull facet between the two inner ear junctions */}
      <path className="lp"
        style={{ '--d': '105', animationDelay: '0.1s' } as React.CSSProperties}
        d="M31,13 L50,7 L69,13 L65,25 L35,25 Z"
      />

      {/* 3 & 4. Outer forehead triangles — crown corner → outer-ear junction → brow outer */}
      <path className="lp"
        style={{ '--d': '62', animationDelay: '0.2s' } as React.CSSProperties}
        d="M35,25 L7,22 L21,38"
      />
      <path className="lp"
        style={{ '--d': '62', animationDelay: '0.2s' } as React.CSSProperties}
        d="M65,25 L93,22 L79,38"
      />

      {/* 5 & 6. Inner forehead lines — crown corner → eye-inner vertex → nose-bridge top */}
      <path className="lp"
        style={{ '--d': '50', animationDelay: '0.3s' } as React.CSSProperties}
        d="M35,25 L42,33 L50,28"
      />
      <path className="lp"
        style={{ '--d': '50', animationDelay: '0.3s' } as React.CSSProperties}
        d="M65,25 L58,33 L50,28"
      />

      {/* 7 & 8. Eye diamonds — four-vertex rhombus, one per side */}
      <path className="lp"
        style={{ '--d': '74', animationDelay: '0.4s' } as React.CSSProperties}
        d="M21,38 L32,28 L42,33 L32,47 Z"
      />
      <path className="lp"
        style={{ '--d': '74', animationDelay: '0.4s' } as React.CSSProperties}
        d="M79,38 L68,28 L58,33 L68,47 Z"
      />

      {/* 9. Nose-bridge diamond — vertical rhombus from brow ridge to muzzle centre */}
      <path className="lp"
        style={{ '--d': '90', animationDelay: '0.5s' } as React.CSSProperties}
        d="M50,28 L44,52 L50,63 L56,52 Z"
      />

      {/* 10 & 11. Cheek diagonals — eye bottom → muzzle outer  +  eye inner → nose side */}
      <path className="lp"
        style={{ '--d': '55', animationDelay: '0.6s' } as React.CSSProperties}
        d="M32,47 L17,63 M42,33 L44,52"
      />
      <path className="lp"
        style={{ '--d': '55', animationDelay: '0.6s' } as React.CSSProperties}
        d="M68,47 L83,63 M58,33 L56,52"
      />

      {/* 12. Muzzle band — W-shaped line forming the whisker-pad top edges */}
      <path className="lp"
        style={{ '--d': '92', animationDelay: '0.7s' } as React.CSSProperties}
        d="M17,63 L37,69 L44,63 L50,63 L56,63 L63,69 L83,63"
      />

      {/* 13. Lower face & chin — whisker-pad polygon, jaw drops, chin point */}
      <path className="lp"
        style={{ '--d': '135', animationDelay: '0.8s' } as React.CSSProperties}
        d="M37,69 L33,82 L50,88 L67,82 L63,69
           M33,82 L33,89
           M67,82 L67,89
           M50,88 L50,96
           M17,63 L17,75
           M83,63 L83,75"
      />
    </svg>
  );
};
