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
    // Stagger the animations
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo */}
      <div className="animate-splash-logo">
        <img 
          src="/lovable-uploads/0b482bd3-18fb-49dd-8a03-f68969572c7e.png" 
          alt="Puma AI Logo" 
          className="h-32 w-32 object-contain"
        />
      </div>

      {/* Welcome Message */}
      <div 
        className={`mt-8 text-center transition-all duration-500 ${
          showWelcome 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome, {userName}
        </h1>
      </div>

      {/* Branding */}
      <div 
        className={`absolute bottom-12 transition-all duration-500 ${
          showBranding 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="text-sm text-muted-foreground tracking-widest uppercase">
          puma ai
        </span>
      </div>
    </div>
  );
};
