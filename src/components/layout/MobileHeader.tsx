import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';
import { useClubContext } from '@/contexts/ClubContext';
import { MobileTeamSwitcher } from './MobileTeamSwitcher';
import { ChevronDown, Users, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { teams } = useAuth();
  const { currentTeam, availableTeams, isMultiTeamUser, viewMode } = useTeamContext();
  const { currentClub, availableClubs, setCurrentClub } = useClubContext();
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [showClubSwitcher, setShowClubSwitcher] = useState(false);

  const isMultiClubUser = availableClubs.length > 1;

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

    return (
      <div className="flex items-center gap-2">
        {/* Club Switcher (if multi-club) */}
        {isMultiClubUser && (
          <button
            onClick={() => setShowClubSwitcher(true)}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/20 border border-white/20"
          >
            {currentClub?.logoUrl ? (
              <img 
                src={currentClub.logoUrl} 
                alt={currentClub.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <span className="text-xs font-medium text-white max-w-[80px] truncate">
              {currentClub?.name || 'Select Club'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
          </button>
        )}

        {/* Team Switcher */}
        {isMultiTeamUser && availableTeams.length > 0 ? (
          <button
            onClick={() => setShowTeamSwitcher(true)}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/20 border border-white/20"
          >
            {viewMode === 'all' ? (
              <>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-white">All Teams</span>
              </>
            ) : currentTeam ? (
              <>
                {currentTeam.logoUrl ? (
                  <img 
                    src={currentTeam.logoUrl} 
                    alt={currentTeam.name}
                    className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                    {getInitials(currentTeam.name)}
                  </div>
                )}
                <span className="text-xs font-medium text-white max-w-[100px] truncate">{currentTeam.name}</span>
              </>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
          </button>
        ) : (
          // Single team display
          (() => {
            const teamToDisplay = currentTeam || teams?.[0];
            if (teamToDisplay) {
              return (
                <div className="flex items-center gap-2">
                  {teamToDisplay.logoUrl ? (
                    <img 
                      src={teamToDisplay.logoUrl} 
                      alt={teamToDisplay.name}
                      className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                      {getInitials(teamToDisplay.name)}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-white truncate">{teamToDisplay.name}</span>
                </div>
              );
            }
            return <span className="text-sm font-medium text-white">Team Manager</span>;
          })()
        )}
      </div>
    );
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

      {/* Club Switcher Sheet */}
      <Sheet open={showClubSwitcher} onOpenChange={setShowClubSwitcher}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl">Switch Club</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)] pb-safe-bottom">
            {availableClubs.map((club) => {
              const isSelected = currentClub?.id === club.id;
              
              return (
                <button
                  key={club.id}
                  onClick={() => {
                    setCurrentClub(club);
                    setShowClubSwitcher(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  {club.logoUrl ? (
                    <img 
                      src={club.logoUrl} 
                      alt={club.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{club.name}</div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
