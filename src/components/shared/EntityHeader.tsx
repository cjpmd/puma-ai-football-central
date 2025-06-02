
import { Building2, Users } from 'lucide-react';

interface EntityHeaderProps {
  logoUrl?: string | null;
  entityName: string;
  entityType: 'team' | 'club';
  className?: string;
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  logoUrl,
  entityName,
  entityType,
  className = ''
}) => {
  const IconComponent = entityType === 'club' ? Building2 : Users;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={`${entityName} logo`}
            className="w-7 h-7 object-contain rounded"
          />
        ) : (
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <span className="font-semibold text-lg">{entityName}</span>
    </div>
  );
};
