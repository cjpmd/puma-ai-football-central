
import React from 'react';

interface EntityHeaderProps {
  logoUrl?: string;
  entityName: string;
  entityType: 'team' | 'club';
  textColor?: string;
  className?: string;
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({ 
  logoUrl, 
  entityName, 
  entityType,
  textColor = "text-gray-900",
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={`${entityName} logo`}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className={`text-sm font-medium ${textColor}`}>
            {entityName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div>
        <h1 className={`text-lg font-semibold ${textColor}`}>
          {entityName}
        </h1>
      </div>
    </div>
  );
};
