
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

  // Helper function to render header content - always show logo + team name
  const renderHeaderContent = () => {
    // Override: If title is provided, still show it (for special pages)
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }

    // Default: Show team logo + team name consistently
    const teamToDisplay = currentTeam || currentClub;
    
    if (teamToDisplay) {
      return (
        <div className="flex items-center gap-2">
          {teamToDisplay.logoUrl ? (
            <img 
              src={teamToDisplay.logoUrl} 
              alt={teamToDisplay.name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(teamToDisplay.name)}
            </div>
          )}
          <span className="text-base font-semibold text-white truncate">{teamToDisplay.name}</span>
        </div>
      );
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
