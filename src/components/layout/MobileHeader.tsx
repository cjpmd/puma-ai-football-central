
import { useAuth } from '@/contexts/AuthContext';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { teams, clubs } = useAuth();

  const currentTeam = teams?.[0];
  const currentClub = clubs?.[0];

  // Helper function to get team initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to render header content based on display type
  const renderHeaderContent = () => {
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }

    if (teams && teams.length > 1) {
      return (
        <div className="flex items-center gap-2">
          {teams.slice(0, 3).map((team, index) => (
            <div key={team.id} className="flex items-center">
              {team.logoUrl ? (
                <img 
                  src={team.logoUrl} 
                  alt={team.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {getInitials(team.name)}
                </div>
              )}
            </div>
          ))}
          {teams.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              +{teams.length - 3}
            </div>
          )}
        </div>
      );
    }

    if (currentClub) {
      return (
        <div className="flex items-center gap-2">
          {currentClub.logoUrl ? (
            <img 
              src={currentClub.logoUrl} 
              alt={currentClub.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {getInitials(currentClub.name)}
            </div>
          )}
          <span className="text-sm font-medium text-white truncate">{currentClub.name}</span>
        </div>
      );
    }

    if (currentTeam) {
      const headerDisplayType = (currentTeam as any).headerDisplayType || 'logo_and_name';
      
      switch (headerDisplayType) {
        case 'logo_and_name':
          return (
            <div className="flex items-center gap-2">
              {currentTeam.logoUrl ? (
                <img 
                  src={currentTeam.logoUrl} 
                  alt={currentTeam.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {getInitials(currentTeam.name)}
                </div>
              )}
              <span className="text-sm font-medium text-white truncate">{currentTeam.name}</span>
            </div>
          );
        case 'logo_only':
          return (
            <div className="flex items-center gap-2">
              {currentTeam.logoUrl ? (
                <img 
                  src={currentTeam.logoUrl} 
                  alt={currentTeam.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {getInitials(currentTeam.name)}
                </div>
              )}
            </div>
          );
        case 'custom_image':
          return (currentTeam as any).headerImageUrl ? (
            <img 
              src={(currentTeam as any).headerImageUrl} 
              alt="Custom header"
              className="h-6 max-w-40 object-contain"
            />
          ) : (
            <span className="text-sm font-medium text-white">Team Manager</span>
          );
        case 'none':
        default:
          return <span className="text-sm font-medium text-white">Team Manager</span>;
      }
    }

    return <span className="text-sm font-medium text-white">Team Manager</span>;
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-500 to-cyan-400 text-white pt-[calc(theme(spacing.safe-top)+0.75rem)]">
      <div className="flex items-center justify-center h-14 px-4">
        {renderHeaderContent()}
      </div>
    </div>
  );
}
