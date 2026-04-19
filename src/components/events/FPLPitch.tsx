import React from 'react';

interface FPLPitchProps {
  className?: string;
}

/**
 * FPL-style pitch — horizontal stripe pattern with simplified white line overlay.
 * Based on Formation.html design from the Origin Sports iOS design bundle.
 */
const FPLPitch: React.FC<FPLPitchProps> = ({ className = '' }) => {
  return (
    <div
      className={`fpl-pitch-wrapper ${className}`}
      style={{
        background: `
          radial-gradient(120% 80% at 50% 0%, oklch(0.55 0.20 295 / 0.55), transparent 60%),
          repeating-linear-gradient(180deg,
            oklch(0.30 0.14 295) 0px 28px,
            oklch(0.25 0.13 295) 28px 56px)
        `,
        boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 20px 60px rgba(0,0,0,0.35)',
      }}
    >
      {/* White pitch line overlay at 18% opacity */}
      <svg
        viewBox="0 0 378 480"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      >
        <g fill="none" stroke="#fff" strokeWidth="1.2">
          {/* Outer boundary */}
          <rect x="4" y="4" width="370" height="472" rx="4" />
          {/* Halfway line */}
          <line x1="4" y1="240" x2="374" y2="240" />
          {/* Centre circle */}
          <circle cx="189" cy="240" r="42" />
          <circle cx="189" cy="240" r="2" fill="#fff" />
          {/* Top penalty box */}
          <rect x="70" y="4" width="238" height="62" />
          <rect x="130" y="4" width="118" height="22" />
          <path d="M130 66 a60 60 0 0 0 118 0" />
          {/* Bottom penalty box */}
          <rect x="70" y="414" width="238" height="62" />
          <rect x="130" y="454" width="118" height="22" />
          <path d="M130 414 a60 60 0 0 1 118 0" />
        </g>
      </svg>
    </div>
  );
};

export default FPLPitch;
