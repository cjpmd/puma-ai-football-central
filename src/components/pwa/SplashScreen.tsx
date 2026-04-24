import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirstName } from '@/utils/nameUtils';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { profile, user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showBranding, setShowBranding] = useState(false);

  const userName = profile?.name
    ? getFirstName(profile.name)
    : user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    const welcomeTimer = setTimeout(() => setShowWelcome(true), 600);
    const brandingTimer = setTimeout(() => setShowBranding(true), 1000);
    const exitTimer = setTimeout(() => setIsExiting(true), 2500);
    const completeTimer = setTimeout(() => onComplete(), 3000);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(brandingTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0B0614 0%, #3B2160 100%)',
      }}
    >
      <style>{`
        @keyframes splash-ring-draw {
          from { stroke-dashoffset: 478; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes splash-tick-fade {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-hand-sweep {
          from { transform: rotate(-90deg); }
          to   { transform: rotate(0deg); }
        }
        @keyframes splash-hub-pop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .splash-ring {
          stroke-dasharray: 478;
          stroke-dashoffset: 478;
          animation: splash-ring-draw 700ms ease-out forwards;
        }
        .splash-tick { transform-origin: center; opacity: 0; animation: splash-tick-fade 300ms ease-out forwards; }
        .splash-tick-1 { animation-delay: 700ms; }
        .splash-tick-2 { animation-delay: 800ms; }
        .splash-tick-3 { animation-delay: 900ms; }
        .splash-tick-4 { animation-delay: 1000ms; }
        .splash-hand {
          transform-origin: 110px 124px;
          transform: rotate(-90deg);
          animation: splash-hand-sweep 1100ms cubic-bezier(0.4, 0, 0.2, 1) 700ms forwards;
        }
        .splash-hub {
          transform-origin: 110px 124px;
          transform: scale(0);
          opacity: 0;
          animation: splash-hub-pop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) 1700ms forwards;
        }
      `}</style>

      {/* Splash mark */}
      <svg
        viewBox="0 0 220 220"
        className="h-40 w-40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="splash-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D9C2F6" />
            <stop offset="100%" stopColor="#8B5BD1" />
          </linearGradient>
        </defs>

        {/* Crown */}
        <rect x="98" y="20" width="24" height="14" rx="4" fill="url(#splash-grad)" />
        <rect x="103" y="10" width="14" height="12" rx="2" fill="url(#splash-grad)" />

        {/* Ring */}
        <circle
          className="splash-ring"
          cx="110"
          cy="124"
          r="76"
          stroke="url(#splash-grad)"
          strokeWidth="12"
          fill="none"
        />

        {/* Tick marks */}
        <g fill="url(#splash-grad)">
          <rect className="splash-tick splash-tick-1" x="108" y="52" width="4" height="12" rx="1.5" />
          <rect className="splash-tick splash-tick-2" x="166" y="122" width="12" height="4" rx="1.5" />
          <rect className="splash-tick splash-tick-3" x="108" y="184" width="4" height="12" rx="1.5" />
          <rect className="splash-tick splash-tick-4" x="42" y="122" width="12" height="4" rx="1.5" />
        </g>

        {/* Hand */}
        <line
          className="splash-hand"
          x1="110"
          y1="124"
          x2="110"
          y2="64"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Hub */}
        <circle className="splash-hub" cx="110" cy="124" r="8" fill="#FFFFFF" />
      </svg>

      {/* Welcome Message */}
      <div
        className={`mt-8 text-center transition-all duration-500 ${
          showWelcome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 className="text-2xl font-semibold text-white">
          Welcome, {userName}
        </h1>
      </div>

      {/* Branding */}
      <div
        className={`absolute bottom-12 transition-all duration-500 ${
          showBranding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="text-sm text-white/60 tracking-widest uppercase">
          origin sports
        </span>
      </div>
    </div>
  );
};
