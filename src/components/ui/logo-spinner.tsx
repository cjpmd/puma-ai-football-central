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
      {/* Geometric Puma/Lion head - simplified polygonal design */}
      {/* Outer head shape */}
      <path 
        className="logo-path"
        d="M50 10 L30 20 L15 35 L10 55 L15 75 L30 88 L50 95 L70 88 L85 75 L90 55 L85 35 L70 20 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left ear */}
      <path 
        className="logo-path logo-path-delay-1"
        d="M30 20 L20 8 L15 25 L15 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right ear */}
      <path 
        className="logo-path logo-path-delay-2"
        d="M70 20 L80 8 L85 25 L85 35"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Inner face details - forehead */}
      <path 
        className="logo-path logo-path-delay-3"
        d="M35 30 L50 25 L65 30"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Left eye area */}
      <path 
        className="logo-path logo-path-delay-4"
        d="M25 45 L35 40 L45 45 L35 50 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Right eye area */}
      <path 
        className="logo-path logo-path-delay-5"
        d="M75 45 L65 40 L55 45 L65 50 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Nose bridge */}
      <path 
        className="logo-path logo-path-delay-6"
        d="M50 45 L45 60 L50 65 L55 60 L50 45"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Mouth/jaw area */}
      <path 
        className="logo-path logo-path-delay-7"
        d="M35 70 L50 75 L65 70 L60 82 L50 85 L40 82 Z"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Cheek lines - left */}
      <path 
        className="logo-path logo-path-delay-8"
        d="M20 55 L30 60 L35 70"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Cheek lines - right */}
      <path 
        className="logo-path logo-path-delay-9"
        d="M80 55 L70 60 L65 70"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
