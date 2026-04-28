import React from 'react';
import { FIFA_CATEGORY_COLORS } from '@/data/fifaPlayStyles';

type IconProps = { size?: number; className?: string };

// Wraps children in a circle badge with category background colour
const Badge = (
  color: string,
  size: number,
  children: React.ReactNode,
  className?: string
) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="20" cy="20" r="19" fill={color} />
    {children}
  </svg>
);

const S = FIFA_CATEGORY_COLORS.scoring;
const P = FIFA_CATEGORY_COLORS.passing;
const B = FIFA_CATEGORY_COLORS.ball_control;
const D = FIFA_CATEGORY_COLORS.defending;
const PH = FIFA_CATEGORY_COLORS.physical;
const G = FIFA_CATEGORY_COLORS.goalkeeping;

// ── SCORING ──────────────────────────────────────────────────────────────────

export const PowerShotIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(S, size, <polygon points="22,8 12,22 19,22 18,32 28,18 21,18" fill="white" />, className);

export const FinesseShotIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <path d="M9 29 C12 14 24 10 30 13" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <polygon points="30,13 24,10 28,18" fill="white" />
    </>,
    className
  );

export const AcrobaticIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <circle cx="13" cy="10" r="3" fill="white" />
      <line x1="13" y1="13" x2="20" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="28" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="14" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="31" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
    </>,
    className
  );

export const ChipShotIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <circle cx="11" cy="28" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M13 25 Q18 10 30 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,2" />
      <polygon points="30,15 25,11 28,20" fill="white" />
    </>,
    className
  );

export const DeadBallIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <circle cx="20" cy="17" r="7" stroke="white" strokeWidth="2" fill="none" />
      <path d="M20 11 L23 14 L22 18 L18 18 L17 14 Z" fill="white" />
      <circle cx="20" cy="30" r="2.5" fill="white" />
      <line x1="20" y1="27" x2="20" y2="24" stroke="white" strokeWidth="1.5" />
    </>,
    className
  );

export const LowDrivenShotIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <line x1="6" y1="29" x2="34" y2="29" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <circle cx="10" cy="25" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M14 25 L28 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="28,25 23,22 23,28" fill="white" />
    </>,
    className
  );

export const PrecisionHeaderIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <>
      <ellipse cx="20" cy="26" rx="8" ry="5" fill="white" />
      <circle cx="20" cy="13" r="5" stroke="white" strokeWidth="2.5" fill="none" />
      <line x1="20" y1="18" x2="20" y2="21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </>,
    className
  );

export const GameChangerIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    S, size,
    <polygon
      points="20,8 23,16 31,16 25,22 27,30 20,25 13,30 15,22 9,16 17,16"
      fill="white"
    />,
    className
  );

// ── PASSING ──────────────────────────────────────────────────────────────────

export const IncisivePassIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <rect x="6" y="13" width="5" height="14" rx="2.5" fill="white" opacity="0.6" />
      <rect x="29" y="13" width="5" height="14" rx="2.5" fill="white" opacity="0.6" />
      <path d="M6 20 L18 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 20 L31 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="31,20 26,17 26,23" fill="white" />
    </>,
    className
  );

export const InventiveIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <path
        d="M20 9 C15 9 12 13 12 17 C12 21 15 23 16 25 L24 25 C25 23 28 21 28 17 C28 13 25 9 20 9 Z"
        fill="white"
      />
      <rect x="16" y="25" width="8" height="2.5" rx="1" fill="white" />
      <rect x="17.5" y="27.5" width="5" height="2" rx="1" fill="white" />
      <line x1="20" y1="7" x2="20" y2="5" stroke="white" strokeWidth="1.5" />
      <line x1="26" y1="9" x2="27.5" y2="7.5" stroke="white" strokeWidth="1.5" />
      <line x1="14" y1="9" x2="12.5" y2="7.5" stroke="white" strokeWidth="1.5" />
    </>,
    className
  );

export const LongBallPassIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <path d="M7 30 Q12 10 32 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="32,14 26,11 26,19" fill="white" />
    </>,
    className
  );

export const PingedPassIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <line x1="6" y1="16" x2="16" y2="16" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <line x1="6" y1="20" x2="30" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="24" x2="16" y2="24" stroke="white" strokeWidth="1.5" opacity="0.5" />
      <polygon points="30,20 25,17 25,23" fill="white" />
    </>,
    className
  );

export const TikiTakaIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <path
        d="M16 14 C16 11 12 10 10 13 C8 16 11 18 14 17"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <polygon points="14,17 10,14 17,14" fill="white" />
      <path
        d="M24 26 C24 29 28 30 30 27 C32 24 29 22 26 23"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <polygon points="26,23 30,26 23,26" fill="white" />
    </>,
    className
  );

export const WhippedPassIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    P, size,
    <>
      <path
        d="M8 29 C10 21 16 13 26 11 Q32 10 30 16"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <polygon points="30,16 24,11 32,11" fill="white" />
    </>,
    className
  );

// ── BALL CONTROL ─────────────────────────────────────────────────────────────

export const FirstTouchIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    B, size,
    <>
      <path
        d="M16 8 C14 8 13 10 13 14 L14 22 C14.5 24 18 27 24 27 L26 25 C21 25 18 22 17.5 21 L16.5 14 C16 10 16 8 16 8 Z"
        fill="white"
      />
      <circle cx="26" cy="20" r="5" stroke="white" strokeWidth="2.5" fill="none" />
    </>,
    className
  );

export const PressProvenIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    B, size,
    <>
      <path
        d="M20 8 L30 13 L30 22 C30 27 25 31 20 33 C15 31 10 27 10 22 L10 13 Z"
        stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round"
      />
      <path
        d="M13 21 L16 18 L19 21 L24 14"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </>,
    className
  );

export const RapidIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    B, size,
    <>
      <line x1="7" y1="20" x2="22" y2="20" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="10" y1="14" x2="26" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="10" y1="26" x2="26" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <polygon points="33,20 24,15 24,25" fill="white" />
    </>,
    className
  );

export const TechnicalIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    B, size,
    <>
      <circle cx="20" cy="20" r="6" stroke="white" strokeWidth="2.5" fill="none" />
      <rect x="18.5" y="8" width="3" height="5" rx="1.5" fill="white" />
      <rect x="18.5" y="27" width="3" height="5" rx="1.5" fill="white" />
      <rect x="8" y="18.5" width="5" height="3" rx="1.5" fill="white" />
      <rect x="27" y="18.5" width="5" height="3" rx="1.5" fill="white" />
      <line x1="11" y1="11" x2="15" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="29" y1="11" x2="25" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="29" x2="15" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="29" y1="29" x2="25" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3" fill="white" />
    </>,
    className
  );

export const TricksterIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    B, size,
    <>
      <path
        d="M20 20 C16 16 10 14 10 10 C10 7 13 6 16 8 C18 9.5 20 12 20 12"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <path
        d="M20 20 C24 24 30 26 30 30 C30 33 27 34 24 32 C22 30.5 20 28 20 28"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <path
        d="M20 20 C24 16 30 14 30 10 C30 7 27 6 24 8 C22 9.5 20 12 20 12"
        stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"
      />
      <circle cx="20" cy="20" r="2.5" fill="white" />
    </>,
    className
  );

// ── DEFENDING ────────────────────────────────────────────────────────────────

export const AerialFortressIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <rect x="10" y="10" width="4" height="5" rx="1" fill="white" />
      <rect x="18" y="10" width="4" height="5" rx="1" fill="white" />
      <rect x="26" y="10" width="4" height="5" rx="1" fill="white" />
      <rect x="10" y="14" width="20" height="14" fill="white" />
      <path d="M17 28 L17 23 Q20 21 23 23 L23 28" fill={D} />
    </>,
    className
  );

export const AnticipateIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <path
        d="M8 20 Q14 12 20 12 Q26 12 32 20 Q26 28 20 28 Q14 28 8 20 Z"
        stroke="white" strokeWidth="2.5" fill="none"
      />
      <circle cx="20" cy="20" r="5" fill="white" />
      <circle cx="20" cy="20" r="2.5" fill={D} />
    </>,
    className
  );

export const BlockIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <path
        d="M20 8 L30 12 L30 22 C30 28 25 32 20 34 C15 32 10 28 10 22 L10 12 Z"
        fill="white"
      />
      <path
        d="M20 11 L27 14 L27 22 C27 26 23.5 29 20 31 C16.5 29 13 26 13 22 L13 14 Z"
        fill={D} opacity="0.35"
      />
    </>,
    className
  );

export const InterceptIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <path
        d="M14 30 L14 18 Q14 16 16 16 Q18 16 18 18 L18 22 Q18 20 20 20 Q22 20 22 22 L22 23 Q22 21 24 21 Q26 21 26 23 L26 27 Q27 25 28 26 Q29 27 28 30 C27 33 23 34 19 34 L16 34 C15 34 14 32 14 30 Z"
        fill="white"
      />
      <circle cx="28" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M28 16 L26 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="2,2" />
    </>,
    className
  );

export const JockeyIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <circle cx="12" cy="10" r="3" fill="white" />
      <line x1="12" y1="13" x2="12" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="23" x2="8" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="23" x2="16" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="15" x2="8" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="15" x2="16" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="10" r="3" fill="white" />
      <line x1="28" y1="13" x2="28" y2="23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="23" x2="24" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="23" x2="32" y2="30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="15" x2="24" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="15" x2="32" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </>,
    className
  );

export const SlideTackleIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    D, size,
    <>
      <circle cx="9" cy="12" r="3" fill="white" />
      <path d="M9 15 L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 16 L22 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 21 L10 27 M22 22 L26 29" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="24" r="5" stroke="white" strokeWidth="2" fill="none" />
    </>,
    className
  );

// ── PHYSICAL ─────────────────────────────────────────────────────────────────

export const BruiserIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    PH, size,
    <>
      <path
        d="M13 20 C13 17 14 16 16 16 L24 16 C27 16 28 17 28 20 L28 26 C28 29 26 31 23 31 L17 31 C14 31 13 29 13 26 Z"
        fill="white"
      />
      <line x1="17" y1="16" x2="17" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="16" x2="20" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="23" y1="16" x2="23" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 22 Q10 21 10 19 Q10 16 13 16" fill="white" />
    </>,
    className
  );

export const EnforcerIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    PH, size,
    <>
      <circle cx="20" cy="9" r="3" stroke="white" strokeWidth="2" fill="none" />
      <line x1="20" y1="12" x2="20" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M12 26 Q12 34 20 32 Q28 34 28 26"
        stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      <circle cx="12" cy="26" r="2.5" fill="white" />
      <circle cx="28" cy="26" r="2.5" fill="white" />
    </>,
    className
  );

export const LongThrowIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    PH, size,
    <>
      <circle cx="10" cy="10" r="3" fill="white" />
      <path d="M10 13 L10 22 M10 22 L7 30 M10 22 L13 30" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M10 15 L18 10 L30 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="31" cy="8" r="4" stroke="white" strokeWidth="2" fill="none" />
      <path d="M30 12 Q32 20 27 27" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="3,2" />
    </>,
    className
  );

export const QuickStepIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    PH, size,
    <>
      <ellipse cx="14" cy="26" rx="4" ry="6" fill="white" transform="rotate(15 14 26)" />
      <ellipse cx="26" cy="18" rx="4" ry="6" fill="white" transform="rotate(15 26 18)" />
      <circle cx="11" cy="20" r="1.5" fill={PH} />
      <circle cx="14" cy="19" r="1.5" fill={PH} />
      <circle cx="17" cy="19" r="1.5" fill={PH} />
      <circle cx="23" cy="12" r="1.5" fill={PH} />
      <circle cx="26" cy="11" r="1.5" fill={PH} />
      <circle cx="29" cy="11" r="1.5" fill={PH} />
    </>,
    className
  );

export const RelentlessIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    PH, size,
    <>
      <circle cx="26" cy="9" r="3" fill="white" />
      <path d="M26 12 L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 14 L30 18 M23 17 L18 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 22 L26 29 M22 22 L16 27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6" y1="16" x2="16" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="6" y1="20" x2="14" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="6" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </>,
    className
  );

// ── GOALKEEPING ───────────────────────────────────────────────────────────────

export const CrossClaimerIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <circle cx="20" cy="14" r="3" fill="white" />
      <path d="M20 17 L20 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 26 L15 32 M20 26 L25 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 19 L10 13 M20 19 L30 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="8" r="4" stroke="white" strokeWidth="2" fill="none" />
    </>,
    className
  );

export const DeflectorIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <rect x="19" y="10" width="4" height="20" rx="2" fill="white" />
      <path d="M8 30 L18 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="18,18 13,19 15,25" fill="white" />
      <path d="M23 14 L33 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="33,8 28,12 31,17" fill="white" />
    </>,
    className
  );

export const FarReachIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <circle cx="10" cy="12" r="3" fill="white" />
      <path d="M10 15 L12 22 M12 22 L9 30 M12 22 L15 28" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M10 17 L32 14" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="33" cy="14" r="2.5" fill="white" />
      <circle cx="33" cy="8" r="4" stroke="white" strokeWidth="2" fill="none" />
    </>,
    className
  );

export const FarThrowIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <circle cx="9" cy="11" r="3" fill="white" />
      <path d="M9 14 L9 24 M9 24 L6 30 M9 24 L12 30" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M11 13 Q18 6 32 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <polygon points="32,18 27,14 28,21" fill="white" />
      <circle cx="11" cy="13" r="3.5" fill="white" />
    </>,
    className
  );

export const FootworkIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <path d="M9 24 Q12 20 16 21 Q18 22 18 26 Q18 30 14 31 Q10 32 9 28 Z" fill="white" />
      <path d="M22 18 Q25 14 29 15 Q31 16 31 20 Q31 24 27 25 Q23 26 22 22 Z" fill="white" />
      <circle cx="20" cy="28" r="2" fill="white" opacity="0.7" />
      <circle cx="26" cy="33" r="1.5" fill="white" opacity="0.5" />
      <circle cx="14" cy="16" r="2" fill="white" opacity="0.7" />
      <circle cx="10" cy="12" r="1.5" fill="white" opacity="0.5" />
    </>,
    className
  );

export const RushOutIcon: React.FC<IconProps> = ({ size = 40, className }) =>
  Badge(
    G, size,
    <>
      <circle cx="12" cy="10" r="3" fill="white" />
      <path d="M12 13 L16 22 M16 22 L12 29 M16 22 L20 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M12 15 L18 12 M15 17 L10 20" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 20 L33 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="33,20 28,17 28,23" fill="white" />
      <line x1="20" y1="16" x2="28" y2="16" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      <line x1="20" y1="24" x2="28" y2="24" stroke="white" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
    </>,
    className
  );

// ── LOOKUP MAP ────────────────────────────────────────────────────────────────

export const PLAY_STYLE_ICON_MAP: Record<string, React.FC<IconProps>> = {
  power_shot: PowerShotIcon,
  finesse_shot: FinesseShotIcon,
  acrobatic: AcrobaticIcon,
  chip_shot: ChipShotIcon,
  dead_ball: DeadBallIcon,
  low_driven_shot: LowDrivenShotIcon,
  precision_header: PrecisionHeaderIcon,
  game_changer: GameChangerIcon,
  incisive_pass: IncisivePassIcon,
  inventive: InventiveIcon,
  long_ball_pass: LongBallPassIcon,
  pinged_pass: PingedPassIcon,
  tiki_taka: TikiTakaIcon,
  whipped_pass: WhippedPassIcon,
  first_touch: FirstTouchIcon,
  press_proven: PressProvenIcon,
  rapid: RapidIcon,
  technical: TechnicalIcon,
  trickster: TricksterIcon,
  aerial_fortress: AerialFortressIcon,
  anticipate: AnticipateIcon,
  block: BlockIcon,
  intercept: InterceptIcon,
  jockey: JockeyIcon,
  slide_tackle: SlideTackleIcon,
  bruiser: BruiserIcon,
  enforcer: EnforcerIcon,
  long_throw: LongThrowIcon,
  quick_step: QuickStepIcon,
  relentless: RelentlessIcon,
  cross_claimer: CrossClaimerIcon,
  deflector: DeflectorIcon,
  far_reach: FarReachIcon,
  far_throw: FarThrowIcon,
  footwork: FootworkIcon,
  rush_out: RushOutIcon,
};

/** Renders the correct icon for a play style value, or null if unknown. */
export function PlayStyleIcon({
  value,
  size = 40,
  isPlus = false,
  className,
}: {
  value: string;
  size?: number;
  isPlus?: boolean;
  className?: string;
}) {
  const Icon = PLAY_STYLE_ICON_MAP[value];
  if (!Icon) return null;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${isPlus ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size} className={className} />
    </span>
  );
}
