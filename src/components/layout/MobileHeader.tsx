import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { MobileTeamSwitcher } from './MobileTeamSwitcher';
import { ChevronDown, Users } from 'lucide-react';
import { useState } from 'react';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { teams, clubs } = useAuth();
  const { currentTeam, availableTeams, isMultiTeamUser, viewMode } = useTeamContext();
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);

  const currentClub = clubs?.[0];

  // Helper function to get team initials
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to render header content
  const renderHeaderContent = () => {
    // Override: If title is provided, show it
    if (title) {
      return <h1 className="text-sm font-semibold text-white truncate">{title}</h1>;
    }

    // Multi-team user: show switcher button
    if (isMultiTeamUser && availableTeams.length > 0) {
      return (
        <button
          onClick={() => setShowTeamSwitcher(true)}
          className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          {viewMode === 'all' ? (
            <>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold text-white">All Teams</span>
            </>
          ) : currentTeam ? (
            <>
              {currentTeam.logoUrl ? (
                <img 
                  src={currentTeam.logoUrl} 
                  alt={currentTeam.name}
                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getInitials(currentTeam.name)}
                </div>
              )}
              <span className="text-base font-semibold text-white truncate">{currentTeam.name}</span>
            </>
          ) : null}
          <ChevronDown className="h-4 w-4 text-white/80 flex-shrink-0" />
        </button>
      );
    }

    // Single team user: static display
    const teamToDisplay = currentTeam || teams?.[0] || currentClub;
    
    if (teamToDisplay) {
      return (
        <div className="flex items-center gap-2">
          {teamToDisplay.logoUrl ? (
            <img 
              src={teamToDisplay.logoUrl} 
              alt={teamToDisplay.name}
              className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
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
    <>
      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-500 to-cyan-400 text-white pt-[calc(theme(spacing.safe-top)+0.75rem)]">
        <div className="flex items-center justify-center h-14 px-4">
          {renderHeaderContent()}
        </div>
      </div>
      
      <MobileTeamSwitcher 
        isOpen={showTeamSwitcher}
        onClose={() => setShowTeamSwitcher(false)}
      />
    </>
  );
}
