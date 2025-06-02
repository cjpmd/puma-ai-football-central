
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

  console.log('EntityHeader rendering with logoUrl:', logoUrl, 'for entity:', entityName);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-8 h-8 flex items-center justify-center rounded bg-muted">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={`${entityName} logo`}
            className="w-7 h-7 object-contain rounded"
            onError={(e) => {
              console.log('EntityHeader logo failed to load:', logoUrl);
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
            onLoad={() => {
              console.log('EntityHeader logo loaded successfully:', logoUrl);
            }}
          />
        ) : (
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        )}
        {logoUrl && <IconComponent className="h-5 w-5 text-muted-foreground hidden" />}
      </div>
      <span className="font-semibold text-lg">{entityName}</span>
    </div>
  );
};
