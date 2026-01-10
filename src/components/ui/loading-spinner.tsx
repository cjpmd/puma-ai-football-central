import React from 'react';
import { cn } from '@/lib/utils';
import { LogoSpinner } from './logo-spinner';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <LogoSpinner size={size} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
};
