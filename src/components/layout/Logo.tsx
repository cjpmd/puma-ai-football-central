import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'auto' | 'purple';
}

export const Logo: React.FC<LogoProps> = ({
  className = "h-8 w-8",
  showText = true,
  variant = 'auto',
}) => {
  const src =
    variant === 'purple'
      ? '/brand/stopwatch-mark-purple.svg'
      : '/brand/stopwatch-mark.svg';

  return (
    <div className="flex items-center gap-2">
      <img src={src} alt="Origin Sports Logo" className={className} />
      {showText && (
        <span className="font-bold text-lg">Origin Sports</span>
      )}
    </div>
  );
};
