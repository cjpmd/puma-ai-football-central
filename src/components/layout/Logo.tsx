
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8", showText = true }) => {
  return (
    <div className="flex items-center gap-2">
      <img 
        src="/lovable-uploads/0b482bd3-18fb-49dd-8a03-f68969572c7e.png" 
        alt="Team Manager Logo" 
        className={className}
      />
      {showText && (
        <span className="font-bold text-lg">Team Manager</span>
      )}
    </div>
  );
};
