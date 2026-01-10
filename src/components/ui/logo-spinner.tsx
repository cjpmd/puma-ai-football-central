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
      {/* Geometric Lion/Puma head - shield-like hexagonal design */}
      
      {/* Outer shield shape */}
      <path 
        className="logo-path"
        d="M50 5 L20 20 L10 50 L20 80 L50 95 L80 80 L90 50 L80 20 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left ear */}
      <path 
        className="logo-path logo-path-delay-1"
        d="M20 20 L8 12 L10 30"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right ear */}
      <path 
        className="logo-path logo-path-delay-2"
        d="M80 20 L92 12 L90 30"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Forehead center line */}
      <path 
        className="logo-path logo-path-delay-3"
        d="M50 5 L50 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Forehead left facet */}
      <path 
        className="logo-path logo-path-delay-3"
        d="M50 5 L30 25 L50 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Forehead right facet */}
      <path 
        className="logo-path logo-path-delay-4"
        d="M50 5 L70 25 L50 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left eye area */}
      <path 
        className="logo-path logo-path-delay-5"
        d="M20 35 L35 30 L40 42 L25 50 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right eye area */}
      <path 
        className="logo-path logo-path-delay-5"
        d="M80 35 L65 30 L60 42 L75 50 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Nose bridge */}
      <path 
        className="logo-path logo-path-delay-6"
        d="M50 35 L45 50 L50 58 L55 50 L50 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left cheek facet */}
      <path 
        className="logo-path logo-path-delay-7"
        d="M10 50 L25 50 L30 65 L20 80"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right cheek facet */}
      <path 
        className="logo-path logo-path-delay-7"
        d="M90 50 L75 50 L70 65 L80 80"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Mouth/jaw - upper */}
      <path 
        className="logo-path logo-path-delay-8"
        d="M30 65 L50 58 L70 65"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Mouth/jaw - lower with teeth hint */}
      <path 
        className="logo-path logo-path-delay-9"
        d="M30 65 L40 75 L50 72 L60 75 L70 65"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Chin */}
      <path 
        className="logo-path logo-path-delay-9"
        d="M40 75 L50 85 L60 75"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
